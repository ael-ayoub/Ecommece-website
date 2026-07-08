import type { Prisma } from "../generated/prisma/client.js";
import { ACTIVE_RESERVATION_STATUSES } from "../config/constants.js";
import { OutOfStockError, NotFoundError } from "./errors.js";

type OrderStatus = (typeof ACTIVE_RESERVATION_STATUSES)[number] | "DELIVERED" | "RETURN_REQUESTED" | "RETURNED" | "REFUNDED" | "CANCELLED";

export interface OrderLineItem {
  product_id: string;
  quantity: number;
}

/**
 * Validates and reserves stock for a brand-new order, inside a transaction.
 * Row-locks each product (SELECT ... FOR UPDATE) so concurrent checkouts can't both
 * oversell the same last unit.
 */
export async function reserveStockForOrder(tx: Prisma.TransactionClient, items: OrderLineItem[]): Promise<void> {
  for (const item of items) {
    const rows = await tx.$queryRaw<Array<{ stock_real: number; stock_reserved: number; is_enabled: boolean; is_deleted: boolean }>>`
      SELECT stock_real, stock_reserved, is_enabled, is_deleted FROM products WHERE id = ${item.product_id}::uuid FOR UPDATE
    `;
    const row = rows[0];
    if (!row || row.is_deleted) throw new NotFoundError(`Product ${item.product_id} not found`);
    if (!row.is_enabled) throw new OutOfStockError(`Product ${item.product_id} is not available for sale`);

    const available = row.stock_real - row.stock_reserved;
    if (available < item.quantity) throw new OutOfStockError(`Not enough stock for product ${item.product_id}`);

    await tx.product.update({
      where: { id: item.product_id },
      data: { stock_reserved: { increment: item.quantity } },
    });
  }
}

/** Per-unit stock deltas to apply when an order transitions from one status to another. */
function computeStockEffect(from: OrderStatus, to: OrderStatus): { stockRealDelta: number; stockReservedDelta: number } {
  const wasReserved = (ACTIVE_RESERVATION_STATUSES as readonly string[]).includes(from);
  const willBeReserved = (ACTIVE_RESERVATION_STATUSES as readonly string[]).includes(to);

  let stockReservedDelta = 0;
  if (wasReserved && !willBeReserved) stockReservedDelta -= 1;
  if (!wasReserved && willBeReserved) stockReservedDelta += 1;

  let stockRealDelta = 0;
  if (to === "DELIVERED" && from !== "DELIVERED") stockRealDelta -= 1;
  if (to === "RETURNED" && from !== "RETURNED") stockRealDelta += 1;

  return { stockRealDelta, stockReservedDelta };
}

/** Applies the stock side effects of an order status transition, inside a transaction. */
export async function applyStatusTransitionStock(
  tx: Prisma.TransactionClient,
  items: Array<{ product_id: string; quantity: number }>,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): Promise<void> {
  const { stockRealDelta, stockReservedDelta } = computeStockEffect(fromStatus, toStatus);
  if (stockRealDelta === 0 && stockReservedDelta === 0) return;

  for (const item of items) {
    await tx.product.update({
      where: { id: item.product_id },
      data: {
        stock_real: stockRealDelta !== 0 ? { increment: stockRealDelta * item.quantity } : undefined,
        stock_reserved: stockReservedDelta !== 0 ? { increment: stockReservedDelta * item.quantity } : undefined,
      },
    });
  }
}
