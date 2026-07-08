import { z } from "zod";

export const createAddressBodySchema = z.object({
  address_line: z.string().min(1),
  phone_home: z.string().optional(),
  phone_personal: z.string().optional(),
  is_default: z.boolean().default(false),
});

export const updateAddressBodySchema = createAddressBodySchema.partial();
