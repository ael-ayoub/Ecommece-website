import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db } from "../../src/lib/db";
import { resetMediaConfigForTests } from "../../src/media/config";
import { resetMediaStorageForTests } from "../../src/media";
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
  uploadProductImages,
} from "../../src/services/product-image.service";
import {
  createProduct,
  getProductById,
  permanentlyDeleteProduct,
} from "../../src/services/product.service";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

function png(width = 2, height = 3) {
  const bytes = Buffer.alloc(45);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt32BE(0, 33);
  bytes.write("IEND", 37, "ascii");
  return bytes;
}

function jpeg(width = 2, height = 3) {
  const bytes = Buffer.alloc(17);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xc0;
  bytes.writeUInt16BE(11, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  bytes[15] = 0xff;
  bytes[16] = 0xd9;
  return bytes;
}

function webp(width = 2, height = 3) {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

test(
  "Product images upload, reorder, promote, isolate ownership, and clean files",
  { skip: !enabled },
  async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "media-integration-"));
    process.env.MEDIA_LOCAL_ROOT = root;
    process.env.MEDIA_PUBLIC_PATH = "/media";
    process.env.MEDIA_PUBLIC_BASE_URL = "";
    process.env.MEDIA_MAX_FILE_SIZE_BYTES = "1024";
    process.env.MEDIA_MAX_IMAGES_PER_PRODUCT = "4";
    process.env.MEDIA_MAX_IMAGE_PIXELS = "100";
    process.env.MEDIA_ALLOWED_MIME_TYPES = "image/png,image/jpeg,image/webp";
    resetMediaConfigForTests();
    resetMediaStorageForTests();

    const category = await db.category.create({
      data: {
        name: `Media ${Date.now()}`,
        slug: `media-${Date.now()}`,
      },
    });
    const create = (name: string, sku: string) =>
      createProduct({
        productType: "SIMPLE" as const,
        name,
        description: "Product image integration",
        categoryId: category.id,
        basePrice: 10,
        images: [],
        isActive: true,
        showExactStock: false,
        sku: { code: sku, stockQuantity: 1, isActive: true },
      });
    const product = await create("Media Product", `MEDIA-${category.id}`);
    const other = await create("Other Product", `MEDIA-OTHER-${category.id}`);

    assert.equal(product.imageRecords.length, 0);
    const uploaded = await uploadProductImages(product.id, [
      {
        bytes: png(2, 3),
        claimedMimeType: "image/png",
        originalName: "../../same-name.png",
        altText: "Front",
      },
      {
        bytes: png(4, 5),
        claimedMimeType: "image/png",
        originalName: "same-name.png",
        altText: "Back",
      },
      {
        bytes: jpeg(6, 7),
        claimedMimeType: "image/jpeg",
        originalName: "photo.jpg",
        altText: "Side",
      },
      {
        bytes: webp(8, 9),
        claimedMimeType: "image/webp",
        originalName: "photo.webp",
        altText: "Detail",
      },
    ]);
    assert.equal(uploaded.length, 4);
    assert.equal(uploaded[0].isPrimary, true);
    assert.notEqual(uploaded[0].url, uploaded[1].url);
    const storedMetadata = await db.productImage.findMany({
      where: { productId: product.id },
      orderBy: { position: "asc" },
    });
    assert.equal(
      storedMetadata[0].storageKey.startsWith(`products/${product.id}/`),
      true,
    );
    assert.equal(storedMetadata[0].storageKey.startsWith("/"), false);
    assert.equal(storedMetadata[0].originalName?.includes(".."), false);
    assert.equal(storedMetadata[0].originalName, "same-name.png");

    const fetched = await getProductById(product.id, {
      includeInactive: true,
    });
    assert.equal(fetched.imageRecords.length, 4);
    assert.equal(fetched.images[0], uploaded[0].url);
    assert.equal(
      (await readdir(path.join(root, "products", String(product.id)))).length,
      4,
    );
    await assert.rejects(() =>
      uploadProductImages(product.id, [
        {
          bytes: png(),
          claimedMimeType: "image/png",
          originalName: "too-many.png",
        },
      ]),
    );
    await assert.rejects(() =>
      uploadProductImages(other.id, [
        {
          bytes: Buffer.alloc(1025),
          claimedMimeType: "image/png",
          originalName: "oversized.png",
        },
      ]),
    );

    const reordered = await reorderProductImages(product.id, [
      uploaded[1].id,
      uploaded[0].id,
      uploaded[2].id,
      uploaded[3].id,
    ]);
    assert.deepEqual(
      reordered.map((image) => image.id),
      [uploaded[1].id, uploaded[0].id, uploaded[2].id, uploaded[3].id],
    );
    const newPrimary = await updateProductImage(product.id, uploaded[1].id, {
      isPrimary: true,
      altText: "New primary",
    });
    assert.equal(newPrimary.isPrimary, true);

    await assert.rejects(() => deleteProductImage(other.id, uploaded[0].id));
    await deleteProductImage(product.id, uploaded[1].id);
    const afterPrimaryDelete = await getProductById(product.id, {
      includeInactive: true,
    });
    assert.equal(afterPrimaryDelete.imageRecords.length, 3);
    assert.equal(afterPrimaryDelete.imageRecords[0].isPrimary, true);

    await assert.rejects(() =>
      uploadProductImages(product.id, [
        {
          bytes: Buffer.from("malformed"),
          claimedMimeType: "image/png",
          originalName: "fake.png",
        },
      ]),
    );
    await assert.rejects(() =>
      uploadProductImages(999_999_999, [
        {
          bytes: png(),
          claimedMimeType: "image/png",
          originalName: "missing.png",
        },
      ]),
    );

    await permanentlyDeleteProduct(product.id);
    assert.equal(
      (await readdir(path.join(root, "products", String(product.id)))).length,
      0,
    );
    assert.equal(
      await db.productImage.count({ where: { productId: product.id } }),
      0,
    );

    await permanentlyDeleteProduct(other.id);
    await db.category.delete({ where: { id: category.id } });
    await rm(root, { recursive: true, force: true });
  },
);
