import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

const DEFAULTS: Prisma.StoreSettingsCreateInput = {
  id: 1,
  store_name: "My Store",
  contact_email: "store@example.com",
  admin_notification_email: "store@example.com",
  currency: "USD",
  default_locale: "en",
  enabled_locales: ["en"],
  guest_checkout_enabled: true,
  low_stock_threshold: 5,
  default_delivery_cost: 0,
};

export const adminSettingsRepository = {
  async get() {
    const existing = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return prisma.storeSettings.create({ data: DEFAULTS });
  },

  async update(data: Prisma.StoreSettingsUpdateInput) {
    await adminSettingsRepository.get(); // ensure the row exists before updating
    return prisma.storeSettings.update({ where: { id: 1 }, data });
  },
};
