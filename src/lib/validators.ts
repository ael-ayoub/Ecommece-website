import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Product catalog (Phase 3) ---------------------------------------------

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  basePrice: z.coerce.number().positive("Price must be greater than 0"),
  categoryId: z.coerce.number().int().positive("Category is required"),
  images: z.array(z.string().url()).optional().default([]),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const variantCreateSchema = z.object({
  variantLabel: z.string().trim().min(1, "Variant label is required"),
  price: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative").default(0),
  isActive: z.boolean().optional().default(true),
});
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;

export const variantUpdateSchema = z.object({
  variantLabel: z.string().trim().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative").optional(),
  isActive: z.boolean().optional(),
});
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});
export type CategoryInput = z.infer<typeof categorySchema>;
