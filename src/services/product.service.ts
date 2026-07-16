import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { Prisma, ProductType } from "@prisma/client";
import type {
  ProductCreateInput,
  ProductUpdateInput,
  VariantCreateInput,
  VariantUpdateInput,
  VariantBatchUpdateInput,
} from "@/lib/validators";
import {
  combinationKey,
  effectivePrice,
  generateOptionCombinations,
  normalizeOptionText,
  normalizeSku,
} from "@/domain/product";
import { recordOptionTemplateUsage } from "@/services/option-template.service";
import { logger } from "@/lib/logger";

const DEFAULT_PAGE_SIZE = 12;

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  search?: string;
  /** Admin views need inactive (soft-deleted) products too; public views never do. */
  includeInactive?: boolean;
}

const productInclude = {
  category: true,
  options: {
    orderBy: { position: "asc" as const },
    include: { values: { orderBy: { position: "asc" as const } } },
  },
  variants: {
    orderBy: { id: "asc" as const },
    include: {
      optionValues: {
        include: { optionValue: { include: { option: true } } },
      },
    },
  },
} as const;

function withDerivedInventory<
  T extends {
    basePrice: Prisma.Decimal;
    isActive: boolean;
    variants: { isActive: boolean; stockQuantity: number; price: Prisma.Decimal | null }[];
  },
>(product: T) {
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const totalStock = activeVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const prices = activeVariants.map((variant) =>
    effectivePrice(product.basePrice.toString(), variant.price?.toString() ?? null),
  );
  const availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE" =
    !product.isActive || activeVariants.length === 0
      ? "UNAVAILABLE"
      : totalStock > 0
        ? "AVAILABLE"
        : "OUT_OF_STOCK";
  return {
    ...product,
    totalStock,
    skuCount: product.variants.length,
    availability,
    minPrice: prices.length ? Math.min(...prices).toFixed(2) : product.basePrice.toFixed(2),
    maxPrice: prices.length ? Math.max(...prices).toFixed(2) : product.basePrice.toFixed(2),
  };
}

export async function listProducts(params: ListProductsParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.ProductWhereInput = {
    ...(params.includeInactive ? {} : { isActive: true }),
    ...(params.categorySlug ? { category: { slug: params.categorySlug } } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { description: { contains: params.search, mode: "insensitive" as const } },
            { category: { name: { contains: params.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return {
    products: products.map(withDerivedInventory),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductById(id: number, opts: { includeInactive?: boolean } = {}) {
  const product = await db.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product || (!opts.includeInactive && !product.isActive)) {
    throw new NotFoundError("Product not found.");
  }

  return withDerivedInventory(product);
}

export async function createProduct(input: ProductCreateInput, adminUserId?: number) {
  try {
    const created = await db.$transaction(async (tx) => {
      if (input.productType === "SIMPLE") {
        const product = await tx.product.create({
          data: {
            name: input.name,
            description: input.description,
            basePrice: input.basePrice.toFixed(2),
            categoryId: input.categoryId,
            images: input.images,
            isActive: input.isActive,
            showExactStock: input.showExactStock,
            productType: ProductType.SIMPLE,
            variants: {
              create: {
                sku: normalizeSku(input.sku.code),
                variantLabel: "Default",
                isDefault: true,
                price: null,
                stockQuantity: input.sku.stockQuantity,
                isActive: input.sku.isActive,
              },
            },
          },
          include: productInclude,
        });
        return withDerivedInventory(product);
      }

      const options = input.options.map((option) => ({
        name: normalizeOptionText(option.name),
        values: option.values.map(normalizeOptionText),
      }));
      const optionNames = options.map((option) => option.name);
      const allowed = new Set(
        generateOptionCombinations(options).map((values) => combinationKey(values, optionNames)),
      );
      const seen = new Set<string>();
      for (const variant of input.variants) {
        const normalizedValues = Object.fromEntries(
          Object.entries(variant.optionValues).map(([name, value]) => [
            normalizeOptionText(name),
            normalizeOptionText(value),
          ]),
        );
        const submittedNames = Object.keys(normalizedValues);
        if (
          submittedNames.length !== optionNames.length ||
          optionNames.some((name) => !Object.prototype.hasOwnProperty.call(normalizedValues, name))
        ) {
          throw new ConflictError(
            "Each explicit SKU must select exactly one value from every Product option and no unknown options.",
          );
        }
        const key = combinationKey(normalizedValues, optionNames);
        if (!allowed.has(key) || seen.has(key)) {
          throw new ConflictError(
            "Each configurable SKU must use one unique valid option combination.",
          );
        }
        seen.add(key);
      }

      const product = await tx.product.create({
        data: {
          name: input.name,
          description: input.description,
          basePrice: input.basePrice.toFixed(2),
          categoryId: input.categoryId,
          images: input.images,
          isActive: input.isActive,
          showExactStock: input.showExactStock,
          productType: ProductType.CONFIGURABLE,
        },
      });

      const optionValueIds = new Map<string, number>();
      for (const [optionPosition, option] of Array.from(options.entries())) {
        const createdOption = await tx.productOption.create({
          data: { productId: product.id, name: option.name, position: optionPosition },
        });
        for (const [valuePosition, value] of Array.from(option.values.entries())) {
          const createdValue = await tx.productOptionValue.create({
            data: { optionId: createdOption.id, value, position: valuePosition },
          });
          optionValueIds.set(`${option.name}\u0000${value}`, createdValue.id);
        }
      }

      for (const variant of input.variants) {
        const normalizedValues = Object.fromEntries(
          Object.entries(variant.optionValues).map(([name, value]) => [
            normalizeOptionText(name),
            normalizeOptionText(value),
          ]),
        );
        const orderedValues = optionNames.map((name) => normalizedValues[name] ?? "");
        const key = combinationKey(normalizedValues, optionNames);
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: normalizeSku(variant.sku),
            variantLabel: variant.variantLabel?.trim() || orderedValues.join(" / "),
            isDefault: false,
            optionCombinationKey: key,
            price: variant.price == null ? null : variant.price.toFixed(2),
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
          },
        });
        await tx.productVariantOptionValue.createMany({
          data: optionNames.map((name, index) => ({
            variantId: createdVariant.id,
            optionValueId: optionValueIds.get(`${name}\u0000${orderedValues[index]}`)!,
          })),
        });
      }

      const created = await tx.product.findUnique({
        where: { id: product.id },
        include: productInclude,
      });
      if (!created) throw new NotFoundError("Product creation failed.");
      return withDerivedInventory(created);
    });
    if (input.productType === "CONFIGURABLE" && adminUserId && input.sourceTemplateIds?.length) {
      await recordOptionTemplateUsage(adminUserId, input.sourceTemplateIds).catch(() => {
        logger.warn("option_template_usage_update_failed", {
          productId: created.id,
          category: "non_critical_usage_tracking",
        });
      });
    }
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A SKU, option name, or option value is already in use.");
    }
    throw error;
  }
}

export async function updateProduct(id: number, input: ProductUpdateInput) {
  await getProductById(id, { includeInactive: true });

  return db.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.basePrice !== undefined ? { basePrice: input.basePrice.toFixed(2) } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.showExactStock !== undefined ? { showExactStock: input.showExactStock } : {}),
    },
    include: productInclude,
  });
}

// Soft delete only — architecture.md's business rules: historical OrderItems
// snapshot product data, so a product is never hard-deleted, just hidden from
// browse/search via isActive = false.
export async function softDeleteProduct(id: number) {
  await getProductById(id, { includeInactive: true });
  return db.product.update({ where: { id }, data: { isActive: false } });
}

export async function addVariant(productId: number, input: VariantCreateInput) {
  const product = await getProductById(productId, { includeInactive: true });
  if (product.productType === ProductType.SIMPLE) {
    throw new ConflictError("Simple product type is immutable and cannot receive another SKU.");
  }

  const optionNames = product.options.map((option) => option.name);
  if (optionNames.length > 0) {
    const selected = input.optionValues ?? {};
    const submittedNames = Object.keys(selected);
    if (
      submittedNames.length !== optionNames.length ||
      optionNames.some((name) => !Object.prototype.hasOwnProperty.call(selected, name))
    ) {
      throw new ConflictError(
        "Select exactly one value from every Product option and no unknown options.",
      );
    }
    const key = combinationKey(selected, optionNames);
    const valueIds = product.options.map((option) => {
      const value = option.values.find((candidate) => candidate.value === selected[option.name]);
      if (!value) throw new ConflictError(`Select one valid value for ${option.name}.`);
      return value.id;
    });
    try {
      return await db.$transaction(async (tx) => {
        const variant = await tx.productVariant.create({
          data: {
            productId,
            sku: normalizeSku(input.sku),
            variantLabel: input.variantLabel,
            optionCombinationKey: key,
            isDefault: false,
            price: input.price !== undefined ? input.price.toFixed(2) : null,
            stockQuantity: input.stockQuantity,
            isActive: input.isActive ?? true,
          },
        });
        await tx.productVariantOptionValue.createMany({
          data: valueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
        });
        return variant;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("This combination or SKU already exists.");
      }
      throw error;
    }
  }
  return db.productVariant.create({
    data: {
      productId,
      sku: normalizeSku(input.sku),
      variantLabel: input.variantLabel,
      isDefault: false,
      price: input.price !== undefined ? input.price.toFixed(2) : null,
      stockQuantity: input.stockQuantity,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateVariant(
  productId: number,
  variantId: number,
  input: VariantUpdateInput,
) {
  const variant = await db.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!variant) {
    throw new NotFoundError("Variant not found.");
  }

  return db.productVariant.update({
    where: { id: variantId, productId },
    data: {
      ...(input.variantLabel !== undefined ? { variantLabel: input.variantLabel } : {}),
      ...(input.sku !== undefined ? { sku: normalizeSku(input.sku) } : {}),
      ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function batchUpdateVariants(productId: number, input: VariantBatchUpdateInput) {
  const ids = input.updates.map((update) => update.id);
  const existing = await db.productVariant.findMany({ where: { productId, id: { in: ids } } });
  if (existing.length !== new Set(ids).size)
    throw new NotFoundError("One or more SKUs were not found.");
  try {
    return await db.$transaction(
      input.updates.map((update) =>
        db.productVariant.update({
          where: { id: update.id, productId },
          data: {
            ...(update.sku !== undefined ? { sku: normalizeSku(update.sku) } : {}),
            ...(update.variantLabel !== undefined
              ? { variantLabel: update.variantLabel.trim() }
              : {}),
            ...(update.stockQuantity !== undefined ? { stockQuantity: update.stockQuantity } : {}),
            ...(update.price !== undefined
              ? { price: update.price === null ? null : update.price.toFixed(2) }
              : {}),
            ...(update.isActive !== undefined ? { isActive: update.isActive } : {}),
          },
        }),
      ),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A SKU code in this batch is already in use.");
    }
    throw error;
  }
}
