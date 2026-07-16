import { Prisma } from "@prisma/client";
import { ConflictError } from "@/lib/errors";

type Tx = Prisma.TransactionClient;

export interface StockLine {
  variantId: number;
  quantity: number;
}

interface LockedVariantRow {
  id: number;
  productId: number;
  productName: string;
  productIsActive: boolean;
  variantLabel: string;
  price: Prisma.Decimal | null;
  basePrice: Prisma.Decimal;
  stockQuantity: number;
  isActive: boolean;
}

export interface OrderLineSnapshot {
  variantId: number;
  productId: number;
  productNameSnapshot: string;
  variantLabelSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
}

/**
 * The one place stock is ever decremented (architecture.md §14). Locks every
 * requested variant row with SELECT ... FOR UPDATE (sorted by id, to avoid
 * deadlocks when two orders touch overlapping variant sets in different
 * orders), validates each against the *locked* (not previously-read) stock
 * value, decrements, and returns snapshot data for OrderItem creation — all
 * within the caller's transaction, so a concurrent order for the same
 * variant genuinely waits for this one to commit or roll back before it can
 * even read the row.
 *
 * Throws ConflictError (rolling back the whole transaction, no partial
 * order) if any line is unavailable or under-stocked.
 */
export async function lockAndDecrementStock(
  tx: Tx,
  lines: StockLine[],
): Promise<OrderLineSnapshot[]> {
  const variantIds = lines.map((l) => l.variantId).sort((a, b) => a - b);

  const rows = await tx.$queryRaw<LockedVariantRow[]>`
    SELECT v.id, v."productId", p.name AS "productName", p."isActive" AS "productIsActive",
           v."variantLabel", v.price, p."basePrice", v."stockQuantity", v."isActive"
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE v.id IN (${Prisma.join(variantIds)})
    ORDER BY v.id
    FOR UPDATE OF v
  `;

  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const line of lines) {
    const row = byId.get(line.variantId);
    if (!row || !row.isActive || !row.productIsActive) {
      throw new ConflictError(
        `One or more items in your cart are no longer available. Please review your cart.`,
      );
    }
    if (row.stockQuantity < line.quantity) {
      throw new ConflictError(
        `Variant ${row.id} does not have enough stock. Please adjust the quantity.`,
      );
    }
  }

  const snapshots: OrderLineSnapshot[] = [];
  for (const line of lines) {
    const row = byId.get(line.variantId)!;
    await tx.productVariant.update({
      where: { id: line.variantId },
      data: { stockQuantity: { decrement: line.quantity } },
    });
    snapshots.push({
      variantId: line.variantId,
      productId: row.productId,
      productNameSnapshot: row.productName,
      variantLabelSnapshot: row.variantLabel,
      unitPriceSnapshot: (row.price ?? row.basePrice).toString(),
      quantity: line.quantity,
    });
  }

  return snapshots;
}

/**
 * Restores stock for every item of a cancelled/returned order, in a single
 * pass within the caller's transaction. Shared by client-initiated
 * cancellation (this phase) and admin cancel/return (Phase 6) — one
 * implementation of "how stock comes back," per architecture.md §4's
 * all-or-nothing restoration rule.
 */
export async function restoreStock(tx: Tx, lines: { variantId: number; quantity: number }[]) {
  for (const line of lines) {
    await tx.productVariant.update({
      where: { id: line.variantId },
      data: { stockQuantity: { increment: line.quantity } },
    });
  }
}
