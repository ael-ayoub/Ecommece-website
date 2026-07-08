import { adminSettingsRepository } from "./settings.repository.js";
import { recordAuditLog } from "../../../lib/audit.js";
import type { z } from "zod";
import type { updateSettingsBodySchema } from "./settings.schema.js";

function serialize(settings: Awaited<ReturnType<typeof adminSettingsRepository.get>>) {
  return { ...settings, default_delivery_cost: Number(settings.default_delivery_cost) };
}

export const adminSettingsService = {
  async get() {
    const settings = await adminSettingsRepository.get();
    return serialize(settings);
  },

  async update(adminId: string, input: z.infer<typeof updateSettingsBodySchema>) {
    const before = await adminSettingsRepository.get();
    const updated = await adminSettingsRepository.update(input);

    await recordAuditLog({
      adminId,
      action: "settings.updated",
      entityType: "store_settings",
      entityId: String(updated.id),
      before: serialize(before),
      after: serialize(updated),
    });

    return serialize(updated);
  },
};
