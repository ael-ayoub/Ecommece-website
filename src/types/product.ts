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
  sku: string;
  isDefault: boolean;
  price: Money | null;
  stockQuantity: number;
  isActive: boolean;
  optionValues?: {
    optionValue: {
      id: number;
      value: string;
      option: { id: number; name: string; position: number };
    };
  }[];
}

export interface ProductOptionDto {
  id: number;
  name: string;
  position: number;
  values: { id: number; value: string; position: number }[];
}

export interface ProductDto {
  id: number;
  categoryId: number;
  category: CategoryDto;
  name: string;
  description: string;
  basePrice: Money;
  productType: "SIMPLE" | "CONFIGURABLE";
  images: string[];
  isActive: boolean;
  variants: ProductVariantDto[];
  options: ProductOptionDto[];
  totalStock: number;
  skuCount: number;
  availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
  minPrice: string;
  maxPrice: string;
  createdAt: Timestamp;
}

export interface ProductListResponse {
  products: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
