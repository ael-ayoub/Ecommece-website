import { apiRequest } from "./client";

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
}

export function listCategories(includeDeleted = false) {
  return apiRequest<{ items: Category[] }>("/admin/categories", { query: { include_deleted: includeDeleted } });
}

export function getCategory(id: string) {
  return apiRequest<Category>(`/admin/categories/${id}`);
}

export interface CategoryInput {
  parent_id?: string | null;
  name: string;
  slug?: string;
  image_url?: string;
}

export function createCategory(input: CategoryInput) {
  return apiRequest<Category>("/admin/categories", { method: "POST", body: input });
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return apiRequest<Category>(`/admin/categories/${id}`, { method: "PUT", body: input });
}

export function deleteCategory(id: string) {
  return apiRequest<{ message: string }>(`/admin/categories/${id}`, { method: "DELETE" });
}
