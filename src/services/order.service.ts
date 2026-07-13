import { db } from "@/lib/db";
import { lockAndDecrementStock, restoreStock } from "@/services/inventory.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { OrderStatus } from "@prisma/client";
import type { OrderCreateInput } from "@/lib/validators";

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, isActive: true } },
      variant: {
        include: { productVariant: { select: { id: true, isActive: true } } },
      },
    },
  },
} as const;

export async function createOrder(input: OrderCreateInput, userId: number | null) {
  return db.$transaction(async (tx) => {
    // Locks every requested variant row, validates live stock, decrements,
    // and returns the snapshot data (name/label/price) to freeze onto the
    // order — all atomically, so a concurrent order for the same variant
    // can't read stale stock (architecture.md §14).
    const lines = await lockAndDecrementStock(
      tx,
      input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    );

    const totalAmount = lines
      .reduce((sum, l) => sum + Number(l.unitPriceSnapshot) * l.quantity, 0)
      .toFixed(2);

    return tx.order.create({
      data: {
        userId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        shippingAddress: input.shippingAddress,
        status: OrderStatus.PENDING,
        totalAmount,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productNameSnapshot: l.productNameSnapshot,
            variant: {
              create: {
                productVariantId: l.variantId,
                variantLabelSnapshot: l.variantLabelSnapshot,
                unitPriceSnapshot: l.unitPriceSnapshot,
                quantity: l.quantity,
              },
            },
          })),
        },
      },
      include: orderInclude,
    });
  });
}

export async function listOrdersForUser(userId: number) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
}

// Ownership-checked: throws NotFoundError (not Forbidden) for both a
// nonexistent order and one that belongs to someone else, so a guessed ID
// never confirms whether that order exists.
export async function getOrderForUser(orderId: number, userId: number) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order || order.userId !== userId) {
    throw new NotFoundError("Order not found.");
  }
  return order;
}

// Client-initiated cancellation: only the owning logged-in user, only while
// Pending (architecture.md §3.2/§3.3). Admin cancel/return (any non-terminal
// state, any order) is a separate, broader operation added in Phase 6.
export async function cancelOrderAsOwner(orderId: number, userId: number) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: true } } },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundError("Order not found.");
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictError("Only Pending orders can be cancelled.");
    }

    // Every locked variant here has a live productVariantId in practice
    // (variants are only ever disabled, never hard-deleted — architecture.md
    // §8) — the null-filter is defensive: a deleted variant's stock has
    // nothing to restore to, but the order itself still gets cancelled.
    const restorable = order.items
      .map((item) => item.variant)
      .filter((v): v is NonNullable<typeof v> => v !== null && v.productVariantId !== null)
      .map((v) => ({ variantId: v.productVariantId as number, quantity: v.quantity }));

    await restoreStock(tx, restorable);

    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: orderInclude,
    });
  });
}

// Exported for Phase 6 (admin ownership bypass — admin can view any order).
export async function getOrderById(orderId: number) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new NotFoundError("Order not found.");
  return order;
}
