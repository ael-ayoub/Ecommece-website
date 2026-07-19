import { createHash } from "node:crypto";
import type { OrderCreateInput } from "@/lib/validators";
import { ConflictError } from "@/lib/errors";

export const MAX_CHECKOUT_QUANTITY = 1000;

export function normalizeCheckoutItems(items: OrderCreateInput["items"]) {
  const quantities = new Map<number, number>();
  for (const item of items) {
    if (
      !Number.isInteger(item.variantId) ||
      item.variantId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > MAX_CHECKOUT_QUANTITY
    ) {
      throw new ConflictError("One or more checkout quantities are invalid.");
    }
    const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
    if (quantity > MAX_CHECKOUT_QUANTITY) {
      throw new ConflictError(
        "The requested quantity for an item is too large.",
      );
    }
    quantities.set(item.variantId, quantity);
  }
  return Array.from(quantities.entries())
    .sort(([left], [right]) => left - right)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function checkoutFingerprint(
  input: Omit<OrderCreateInput, "items"> & {
    items: { variantId: number; quantity: number }[];
  },
  userId: number | null,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        identity: userId === null ? "guest" : `user:${userId}`,
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone.trim(),
        shippingAddress: input.shippingAddress.trim(),
        items: input.items,
      }),
    )
    .digest("hex");
}
