import { db } from "@/lib/db";
import { Prisma, OrderStatus } from "@prisma/client";
import { lockAndDecrementStock, restoreStock } from "@/services/inventory.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { OrderCreateInput } from "@/lib/validators";
import type { OrderStatusValue } from "@/types/order";
import { checkoutFingerprint, normalizeCheckoutItems } from "@/domain/checkout";
import { canTransitionOrder, transitionRestoresStock } from "@/domain/order-status";
import { ensureOutboxDispatcher } from "@/lib/realtime/outbox";

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, isActive: true } },
      variant: {
        include: { productVariant: { select: { id: true, isActive: true } } },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} as const;

type Tx = Prisma.TransactionClient;

interface LockedOrderRow {
  id: number;
  userId: number | null;
  status: OrderStatus;
}

// Locks the Order row itself for the duration of a read-validate-write
// status change (Phase 8 hardening). Without this, two concurrent status
// changes on the *same* order (e.g. two admin tabs both clicking Cancel, or
// an admin and the owning client racing each other) can each read the same
// pre-change status under READ COMMITTED, both pass validation, and both
// restore stock — a real double-restoration bug found and fixed in Phase 8
// (reproduced: two concurrent cancels on one order inflated stock by 2x the
// order's quantity instead of 1x). FOR UPDATE here means the second
// transaction blocks until the first commits, then reads the *already
// updated* status and correctly rejects instead of double-processing.
async function lockOrderForUpdate(tx: Tx, orderId: number): Promise<LockedOrderRow | null> {
  const rows = await tx.$queryRaw<LockedOrderRow[]>`
    SELECT id, "userId", status FROM "Order" WHERE id = ${orderId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function createOrder(
  input: OrderCreateInput,
  userId: number | null,
  idempotencyKey: string,
) {
  const items = normalizeCheckoutItems(input.items);
  const fingerprint = checkoutFingerprint({ ...input, items }, userId);
  const existing = await db.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
  if (existing) {
    if (existing.idempotencyFingerprint !== fingerprint) {
      throw new ConflictError("This idempotency key was already used for different checkout data.");
    }
    return { order: existing, replayed: true };
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const lines = await lockAndDecrementStock(tx, items);
      const totalAmount = lines
        .reduce((sum, line) => sum + Number(line.unitPriceSnapshot) * line.quantity, 0)
        .toFixed(2);

      const created = await tx.order.create({
        data: {
          userId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          shippingAddress: input.shippingAddress,
          status: OrderStatus.PENDING,
          totalAmount,
          idempotencyKey,
          idempotencyFingerprint: fingerprint,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              productNameSnapshot: line.productNameSnapshot,
              imageSnapshot: line.imageSnapshot,
              variant: {
                create: {
                  productVariantId: line.variantId,
                  variantLabelSnapshot: line.variantLabelSnapshot,
                  skuSnapshot: line.skuSnapshot,
                  optionValuesSnapshot: line.optionValuesSnapshot,
                  unitPriceSnapshot: line.unitPriceSnapshot,
                  quantity: line.quantity,
                },
              },
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING,
              changedByUserId: userId,
              actorType: userId === null ? "SYSTEM" : "CLIENT",
            },
          },
        },
        include: orderInclude,
      });
      await tx.outboxEvent.create({
        data: {
          eventType: "ORDER_CREATED",
          aggregateType: "ORDER",
          aggregateId: String(created.id),
          payload: { orderId: created.id, eventType: "ORDER_CREATED" },
        },
      });
      return created;
    });
    ensureOutboxDispatcher();
    return { order, replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await db.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
      if (raced?.idempotencyFingerprint === fingerprint) return { order: raced, replayed: true };
      throw new ConflictError("This idempotency key was already used for different checkout data.");
    }
    throw error;
  }
}

export async function listOrdersForUser(userId: number, page = 1, pageSize = 20) {
  const where = { userId };
  const [data, totalItems] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: orderInclude,
    }),
    db.order.count({ where }),
  ]);
  return { data, totalItems };
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
  const order = await db.$transaction(async (tx) => {
    const locked = await lockOrderForUpdate(tx, orderId);

    if (!locked || locked.userId !== userId) {
      throw new NotFoundError("Order not found.");
    }
    if (locked.status !== OrderStatus.PENDING) {
      throw new ConflictError("Only Pending orders can be cancelled.");
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { variant: true },
    });

    // Every locked variant here has a live productVariantId in practice
    // (variants are only ever disabled, never hard-deleted — architecture.md
    // §8) — the null-filter is defensive: a deleted variant's stock has
    // nothing to restore to, but the order itself still gets cancelled.
    const restorable = items
      .map((item) => item.variant)
      .filter((v): v is NonNullable<typeof v> => v !== null && v.productVariantId !== null)
      .map((v) => ({ variantId: v.productVariantId as number, quantity: v.quantity }));

    await restoreStock(tx, restorable);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        statusHistory: {
          create: {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CANCELLED,
            changedByUserId: userId,
            actorType: "CLIENT",
          },
        },
      },
      include: orderInclude,
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "ORDER_STATUS_CHANGED",
        aggregateType: "ORDER",
        aggregateId: String(orderId),
        payload: { orderId, eventType: "ORDER_STATUS_CHANGED" },
      },
    });
    return updated;
  });

  ensureOutboxDispatcher();
  return order;
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
  page?: number;
  pageSize?: number;
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

  const direction = params.sortDir ?? "desc";
  const orderBy: Prisma.OrderOrderByWithRelationInput[] =
    params.sortBy === "price"
      ? [{ totalAmount: direction }, { id: direction }]
      : [{ createdAt: direction }, { id: direction }];
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const [data, totalItems] = await Promise.all([
    db.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: orderInclude,
    }),
    db.order.count({ where }),
  ]);
  return { data, totalItems };
}

export async function listRecentOrders(limit: number) {
  return db.order.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: orderInclude });
}

// Admin-driven status change: an admin (and only an admin — enforced by
// requireAdmin() in the route) can move an order to any of the six locked
// statuses (architecture.md §3.2) regardless of its current status, not just
// the forward-progression matrix. Stock is kept consistent either way: moving
// into Cancelled/Returned restores stock (as before), and moving *out* of
// Cancelled/Returned back into an active status re-decrements it, so
// reversing a cancellation/return doesn't silently double-count inventory.
export async function updateOrderStatusAsAdmin(
  orderId: number,
  nextStatus: OrderStatusValue,
  adminUserId: number,
) {
  const order = await db.$transaction(async (tx) => {
    const locked = await lockOrderForUpdate(tx, orderId);

    if (!locked) {
      throw new NotFoundError("Order not found.");
    }

    const currentStatus = locked.status as OrderStatusValue;
    if (currentStatus === nextStatus) {
      const unchanged = await tx.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      });
      if (!unchanged) throw new NotFoundError("Order not found.");
      return unchanged;
    }
    if (!canTransitionOrder(currentStatus, nextStatus)) {
      throw new ConflictError(`Order cannot move from ${currentStatus} to ${nextStatus}.`);
    }
    if (transitionRestoresStock(currentStatus, nextStatus)) {
      const items = await tx.orderItem.findMany({ where: { orderId }, include: { variant: true } });
      const restorable = items
        .map((item) => item.variant)
        .filter((variant): variant is NonNullable<typeof variant> =>
          Boolean(variant?.productVariantId),
        )
        .map((variant) => ({
          variantId: variant.productVariantId as number,
          quantity: variant.quantity,
        }));
      await restoreStock(tx, restorable);
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus as OrderStatus,
        statusHistory: {
          create: {
            fromStatus: currentStatus as OrderStatus,
            toStatus: nextStatus as OrderStatus,
            changedByUserId: adminUserId,
            actorType: "ADMIN",
          },
        },
      },
      include: orderInclude,
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "ORDER_STATUS_CHANGED",
        aggregateType: "ORDER",
        aggregateId: String(orderId),
        payload: { orderId, eventType: "ORDER_STATUS_CHANGED" },
      },
    });
    return updated;
  });

  ensureOutboxDispatcher();
  return order;
}
