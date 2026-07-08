import { z } from "zod";

export const updateSettingsBodySchema = z.object({
  store_name: z.string().min(1).optional(),
  store_logo_url: z.string().url().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  contact_address: z.string().optional(),
  currency: z.string().min(1).optional(),
  default_locale: z.enum(["ar", "fr", "en"]).optional(),
  enabled_locales: z.array(z.enum(["ar", "fr", "en"])).min(1).optional(),
  guest_checkout_enabled: z.boolean().optional(),
  low_stock_threshold: z.coerce.number().int().nonnegative().optional(),
  default_delivery_cost: z.coerce.number().nonnegative().optional(),
  order_status_labels: z.record(z.string()).optional(),
  admin_notification_email: z.string().email().optional(),
});
