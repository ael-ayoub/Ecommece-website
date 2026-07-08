import { apiRequest } from "./client";
import type { PaginationMeta } from "./orders";

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  // Admin-sensitive fields — never exposed on the customer-facing API. Fine here (admin-only app).
  cost_price: number;
  stock_real: number;
  stock_reserved: number;
  stock_display: number;
  is_enabled: boolean;
  is_deleted: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  category_id?: string;
  q?: string;
  include_deleted?: boolean;
}

export function listProducts(params: ListProductsParams = {}) {
  return apiRequest<{ items: Product[]; meta: PaginationMeta }>("/admin/products", {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function getProduct(id: string) {
  return apiRequest<Product>(`/admin/products/${id}`);
}

export interface ProductInput {
  category_id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  cost_price: number;
  stock_real: number;
  stock_display: number;
  is_enabled: boolean;
  images: string[];
}

export function createProduct(input: ProductInput) {
  return apiRequest<Product>("/admin/products", { method: "POST", body: input });
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiRequest<Product>(`/admin/products/${id}`, { method: "PUT", body: input });
}

export function updateProductStock(id: string, stock: { stock_real?: number; stock_display?: number }) {
  return apiRequest<Product>(`/admin/products/${id}/stock`, { method: "PATCH", body: stock });
}

export function toggleProductEnabled(id: string, isEnabled: boolean) {
  return apiRequest<Product>(`/admin/products/${id}/toggle-enabled`, { method: "PATCH", body: { is_enabled: isEnabled } });
}

export function deleteProduct(id: string) {
  return apiRequest<{ message: string }>(`/admin/products/${id}`, { method: "DELETE" });
}
