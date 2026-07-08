import { z } from "zod";

export const addCartItemBodySchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const updateCartItemBodySchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

export const cartItemParamsSchema = z.object({
  itemId: z.string().uuid(),
});
