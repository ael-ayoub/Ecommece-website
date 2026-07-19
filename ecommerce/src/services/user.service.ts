import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { OrderStatus, Prisma, Role } from "@prisma/client";
import type { ClientUpdateInput } from "@/lib/validators";

// Admin Clients page (admin-dashboard-spec.md §7) — registered clients only;
// guests have no account and never appear here (they're visible via the
// Orders page instead, per architecture.md's guest-has-no-tracking rule).
export async function listClients() {
  const clients = await db.user.findMany({
    where: { role: Role.CLIENT },
    orderBy: { name: "asc" },
    include: {
      orders: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { orders: true } },
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    isActive: c.isActive,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    lastOrderDate: c.orders[0]?.createdAt ?? null,
  }));
}

export async function getClientWithOrders(userId: number) {
  const client = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, isActive: true } },
              variant: {
                include: {
                  productVariant: { select: { id: true, isActive: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!client || client.role !== Role.CLIENT) {
    throw new NotFoundError("Client not found.");
  }

  return client;
}

export async function updateClient(userId: number, input: ClientUpdateInput) {
  const client = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!client || client.role !== Role.CLIENT)
    throw new NotFoundError("Client not found.");

  try {
    return await db.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("Email is already registered.");
    }
    throw error;
  }
}

export async function permanentlyDeleteClient(userId: number) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "User"
      WHERE id = ${userId} AND role = 'CLIENT'
      FOR UPDATE
    `;
    if (rows.length === 0) throw new NotFoundError("Client not found.");

    const activeOrderCount = await tx.order.count({
      where: {
        userId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
        },
      },
    });
    if (activeOrderCount > 0) {
      throw new ConflictError(
        `This customer has ${activeOrderCount} active order(s). Complete, cancel, or return them before deleting the customer.`,
      );
    }

    await tx.user.delete({ where: { id: userId } });
  });
}
