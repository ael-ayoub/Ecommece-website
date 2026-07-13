// A cart line item is a snapshot of the chosen variant at add-to-cart time —
// name/price/stock are captured then, not re-derived live (Phase 4 scope:
// "keep the cart's client-side view accurate against the stock values it
// already has" — live re-validation against the server happens at checkout,
// in a later phase).
export interface CartItem {
  /** `${productId}:${variantId}` — stable key, also used to merge duplicate adds. */
  id: string;
  productId: number;
  productName: string;
  productImage: string | null;
  variantId: number;
  variantLabel: string;
  /** Unit price at add-to-cart time, as a plain number for arithmetic. */
  unitPrice: number;
  /** Stock available for this variant at add-to-cart time — caps the quantity stepper. */
  stockQuantity: number;
  quantity: number;
}
