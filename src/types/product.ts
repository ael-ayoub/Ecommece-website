import type { Prisma } from "@prisma/client";

// Widened to accept both a real Prisma payload (Server Components call
// services directly: Decimal/Date instances) and JSON-fetched data (client
// components via apiFetch: Decimal/Date serialize to strings) — one type for
// both instead of maintaining a parallel "wire" type that would drift.
type Money = string | Prisma.Decimal;
type Timestamp = string | Date;

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  createdAt: Timestamp;
  _count?: { products: number };
}

export interface ProductVariantDto {
  id: number;
  productId: number;
  variantLabel: string;
  price: Money | null;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductDto {
  id: number;
  categoryId: number;
  category: CategoryDto;
  name: string;
  description: string;
  basePrice: Money;
  images: string[];
  isActive: boolean;
  variants: ProductVariantDto[];
  createdAt: Timestamp;
}

export interface ProductListResponse {
  products: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
