import { z } from "zod";

/**
 * Shipping/contact snapshot for this order. Column names in the DB keep the
 * "guest_" prefix from the original schema, but this same snapshot is stored
 * for logged-in customers too — never referenced live from `users`/`addresses`.
 */
export const createOrderBodySchema = z.object({
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone_home: z.string().min(1),
  guest_phone_personal: z.string().optional(),
  guest_address: z.string().min(1),
});

export const listMyOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
