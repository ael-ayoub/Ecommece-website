import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import type {
  ProductCreateInput,
  ProductUpdateInput,
  VariantCreateInput,
  VariantUpdateInput,
} from "@/lib/validators";

const DEFAULT_PAGE_SIZE = 12;

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  search?: string;
  /** Admin views need inactive (soft-deleted) products too; public views never do. */
  includeInactive?: boolean;
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
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductById(id: number, opts: { includeInactive?: boolean } = {}) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: { id: "asc" } },
    },
  });

  if (!product || (!opts.includeInactive && !product.isActive)) {
    throw new NotFoundError("Product not found.");
  }

  return product;
}

export async function createProduct(input: ProductCreateInput) {
  return db.product.create({
    data: {
      name: input.name,
      description: input.description,
      basePrice: input.basePrice.toFixed(2),
      categoryId: input.categoryId,
      images: input.images ?? [],
    },
    include: { category: true, variants: true },
  });
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
    },
    include: { category: true, variants: true },
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
  await getProductById(productId, { includeInactive: true });

  return db.productVariant.create({
    data: {
      productId,
      variantLabel: input.variantLabel,
      price: input.price !== undefined ? input.price.toFixed(2) : null,
      // Stock is set explicitly by the admin at variant-creation time (no
      // implicit default beyond schema's 0) — consistent with per-variant
      // stock being admin-managed, per architecture.md §4.
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
      ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}
