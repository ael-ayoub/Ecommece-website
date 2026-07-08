import { z } from "zod";

export const createCategoryBodySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  image_url: z.string().url().optional(),
});

export const updateCategoryBodySchema = createCategoryBodySchema.partial();

export const listCategoriesQuerySchema = z.object({
  include_deleted: z.coerce.boolean().default(false),
});
