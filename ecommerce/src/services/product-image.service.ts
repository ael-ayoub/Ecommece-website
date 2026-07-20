import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getMediaConfig } from "@/media/config";
import { validateImageFile } from "@/media/image-file";
import { getMediaStorage } from "@/media";
import { safeOriginalName } from "@/media/storage-key";

export interface ProductImageUpload {
  bytes: Buffer;
  claimedMimeType: string;
  originalName: string;
  altText?: string | null;
}

export interface ProductImageResponse {
  id: number;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

type ProductImageRecord = {
  id: number;
  storageKey: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export function toProductImageResponse(
  image: ProductImageRecord,
): ProductImageResponse {
  return {
    id: image.id,
    url: getMediaStorage().resolvePublicUrl(image.storageKey),
    altText: image.altText,
    position: image.position,
    isPrimary: image.isPrimary,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
  };
}

export function selectDisplayImage<
  T extends { position: number; isPrimary: boolean },
>(images: T[]) {
  return (
    images.find((image) => image.isPrimary) ??
    [...images].sort((a, b) => a.position - b.position)[0] ??
    null
  );
}

export async function uploadProductImages(
  productId: number,
  uploads: ProductImageUpload[],
) {
  if (uploads.length === 0) {
    throw new ApiError(400, "Select at least one image.");
  }
  const config = getMediaConfig();
  if (uploads.length > config.maxImagesPerProduct) {
    throw new ConflictError(
      `A Product may have at most ${config.maxImagesPerProduct} images.`,
    );
  }

  const validated = uploads.map((upload) => ({
    upload,
    details: validateImageFile(upload.bytes, upload.claimedMimeType),
  }));
  const storage = getMediaStorage();
  const savedKeys: string[] = [];

  try {
    const created = await db.$transaction(async (tx) => {
      const products = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE
      `;
      if (products.length === 0) throw new NotFoundError("Product not found.");

      await tx.$queryRaw`
        SELECT id FROM "ProductImage"
        WHERE "productId" = ${productId}
        ORDER BY position
        FOR UPDATE
      `;
      const existing = await tx.productImage.count({ where: { productId } });
      if (existing + validated.length > config.maxImagesPerProduct) {
        throw new ConflictError(
          `A Product may have at most ${config.maxImagesPerProduct} images.`,
        );
      }

      const records = [];
      for (let index = 0; index < validated.length; index += 1) {
        const item = validated[index];
        const storageKey = `products/${productId}/${randomUUID()}.${item.details.extension}`;
        await storage.save(storageKey, item.upload.bytes);
        savedKeys.push(storageKey);
        records.push(
          await tx.productImage.create({
            data: {
              productId,
              storageKey,
              originalName: safeOriginalName(item.upload.originalName),
              mimeType: item.details.mimeType,
              sizeBytes: item.upload.bytes.length,
              width: item.details.width,
              height: item.details.height,
              altText: item.upload.altText?.trim().slice(0, 300) || null,
              position: existing + index,
              isPrimary: existing === 0 && index === 0,
            },
          }),
        );
      }
      return records;
    });

    logger.info("product_images_uploaded", {
      productId,
      imageCount: created.length,
    });
    return created.map(toProductImageResponse);
  } catch (error) {
    await Promise.all(
      savedKeys.map((storageKey) =>
        storage.delete(storageKey).catch(() => {
          logger.warn("product_image_compensation_failed", {
            productId,
            storageKey,
          });
        }),
      ),
    );
    throw error;
  }
}

export async function updateProductImage(
  productId: number,
  imageId: number,
  input: { altText?: string | null; isPrimary?: boolean },
) {
  const image = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "ProductImage"
      WHERE id = ${imageId} AND "productId" = ${productId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new NotFoundError("Product image not found.");

    if (input.isPrimary) {
      await tx.productImage.updateMany({
        where: { productId, isPrimary: true, id: { not: imageId } },
        data: { isPrimary: false },
      });
    }
    return tx.productImage.update({
      where: { id: imageId },
      data: {
        ...(input.altText !== undefined
          ? { altText: input.altText?.trim().slice(0, 300) || null }
          : {}),
        ...(input.isPrimary !== undefined
          ? { isPrimary: input.isPrimary }
          : {}),
      },
    });
  });
  return toProductImageResponse(image);
}

export async function reorderProductImages(
  productId: number,
  orderedImageIds: number[],
) {
  const images = await db.$transaction(async (tx) => {
    const products = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;
    if (products.length === 0) throw new NotFoundError("Product not found.");
    const current = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });
    if (
      orderedImageIds.length !== current.length ||
      new Set(orderedImageIds).size !== current.length ||
      current.some((image) => !orderedImageIds.includes(image.id))
    ) {
      throw new ApiError(
        400,
        "Image order must contain every Product image exactly once.",
      );
    }

    const offset = current.length + 100;
    for (const image of current) {
      await tx.productImage.update({
        where: { id: image.id },
        data: { position: image.position + offset },
      });
    }
    for (let position = 0; position < orderedImageIds.length; position += 1) {
      const id = orderedImageIds[position];
      await tx.productImage.update({ where: { id }, data: { position } });
    }
    return tx.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });
  });
  return images.map(toProductImageResponse);
}

export async function deleteProductImage(productId: number, imageId: number) {
  const deleted = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: number; storageKey: string; isPrimary: boolean }>
    >`
      SELECT id, "storageKey", "isPrimary"
      FROM "ProductImage"
      WHERE id = ${imageId} AND "productId" = ${productId}
      FOR UPDATE
    `;
    const image = rows[0];
    if (!image) throw new NotFoundError("Product image not found.");

    await tx.productImage.delete({ where: { id: imageId } });
    const remaining = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });
    for (let position = 0; position < remaining.length; position += 1) {
      const item = remaining[position];
      await tx.productImage.update({
        where: { id: item.id },
        data: {
          position: position + remaining.length + 100,
          ...(image.isPrimary ? { isPrimary: false } : {}),
        },
      });
    }
    for (let position = 0; position < remaining.length; position += 1) {
      const item = remaining[position];
      await tx.productImage.update({
        where: { id: item.id },
        data: {
          position,
          ...(image.isPrimary && position === 0 ? { isPrimary: true } : {}),
        },
      });
    }
    return image;
  });

  try {
    await getMediaStorage().delete(deleted.storageKey);
  } catch {
    logger.warn("product_image_file_cleanup_failed", {
      productId,
      imageId,
      storageKey: deleted.storageKey,
    });
  }
  logger.info("product_image_deleted", { productId, imageId });
}

export async function deleteStoredProductImages(
  productId: number,
  storageKeys: string[],
) {
  await Promise.all(
    storageKeys.map((storageKey) =>
      getMediaStorage()
        .delete(storageKey)
        .catch(() =>
          logger.warn("product_image_file_cleanup_failed", {
            productId,
            storageKey,
          }),
        ),
    ),
  );
}
