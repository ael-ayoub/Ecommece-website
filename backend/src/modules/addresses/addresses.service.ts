import { addressesRepository } from "./addresses.repository.js";
import { NotFoundError } from "../../lib/errors.js";
import type { z } from "zod";
import type { createAddressBodySchema, updateAddressBodySchema } from "./addresses.schema.js";

export const addressesService = {
  list(userId: string) {
    return addressesRepository.listForUser(userId);
  },

  async create(userId: string, input: z.infer<typeof createAddressBodySchema>) {
    if (input.is_default) await addressesRepository.clearDefaultForUser(userId);
    return addressesRepository.create(userId, input);
  },

  async update(userId: string, id: string, input: z.infer<typeof updateAddressBodySchema>) {
    const address = await addressesRepository.findById(id);
    if (!address || address.user_id !== userId) throw new NotFoundError("Address not found");

    if (input.is_default) await addressesRepository.clearDefaultForUser(userId);
    return addressesRepository.update(id, input);
  },

  async remove(userId: string, id: string) {
    const address = await addressesRepository.findById(id);
    if (!address || address.user_id !== userId) throw new NotFoundError("Address not found");

    await addressesRepository.remove(id);
    return { message: "Address deleted" };
  },
};
