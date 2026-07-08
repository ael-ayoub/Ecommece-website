import { z } from "zod";

export const createProductBodySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  cost_price: z.coerce.number().nonnegative(),
  stock_real: z.coerce.number().int().nonnegative().default(0),
  stock_display: z.coerce.number().int().nonnegative().default(0),
  is_enabled: z.boolean().default(true),
  images: z.array(z.string().url()).default([]),
});

export const updateProductBodySchema = createProductBodySchema.partial();

export const updateStockBodySchema = z.object({
  stock_real: z.coerce.number().int().nonnegative().optional(),
  stock_display: z.coerce.number().int().nonnegative().optional(),
});

export const toggleEnabledBodySchema = z.object({
  is_enabled: z.boolean(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category_id: z.string().uuid().optional(),
  q: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});
