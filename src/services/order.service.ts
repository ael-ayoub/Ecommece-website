import { db } from "@/lib/db";
import { Prisma, OrderStatus } from "@prisma/client";
import { lockAndDecrementStock, restoreStock } from "@/services/inventory.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { ADMIN_ORDER_TRANSITIONS, STOCK_RESTORING_STATUSES } from "@/constants/order-status";
import type { OrderCreateInput } from "@/lib/validators";
import type { OrderStatusValue } from "@/types/order";

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

// Admin ownership bypass — admin can view any order regardless of who placed it.
export async function getOrderById(orderId: number) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new NotFoundError("Order not found.");
  return order;
}

export interface AdminOrderListParams {
  status?: OrderStatusValue;
  search?: string; // matches contactName or contactEmail
  sortBy?: "date" | "price";
  sortDir?: "asc" | "desc";
}

// Every order regardless of guest/logged-in origin (architecture.md §6 —
// admin sees all orders; only the *client's* own history is scoped by user).
export async function listOrdersAdmin(params: AdminOrderListParams) {
  const where: Prisma.OrderWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { contactName: { contains: params.search, mode: "insensitive" as const } },
            { contactEmail: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    params.sortBy === "price"
      ? { totalAmount: params.sortDir ?? "desc" }
      : { createdAt: params.sortDir ?? "desc" };

  return db.order.findMany({ where, orderBy, include: orderInclude });
}

export async function listRecentOrders(limit: number) {
  return db.order.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: orderInclude });
}

// Admin-driven status change: validates the transition against the exact
// locked matrix (architecture.md §3.2 — see ADMIN_ORDER_TRANSITIONS), and
// restores stock atomically when moving into Cancelled or Returned, reusing
// the same restoreStock() the client's own cancellation uses (one
// implementation of "how stock comes back," per inventory.service.ts).
export async function updateOrderStatusAsAdmin(orderId: number, nextStatus: OrderStatusValue) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: true } } },
    });

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    const allowed = ADMIN_ORDER_TRANSITIONS[order.status as OrderStatusValue];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictError(`Cannot move an order from ${order.status} to ${nextStatus}.`);
    }

    if (STOCK_RESTORING_STATUSES.includes(nextStatus)) {
      const restorable = order.items
        .map((item) => item.variant)
        .filter((v): v is NonNullable<typeof v> => v !== null && v.productVariantId !== null)
        .map((v) => ({ variantId: v.productVariantId as number, quantity: v.quantity }));

      await restoreStock(tx, restorable);
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus as OrderStatus },
      include: orderInclude,
    });
  });
}
