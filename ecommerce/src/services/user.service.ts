import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { Role } from "@prisma/client";

// Admin Clients page (admin-dashboard-spec.md §7) — registered clients only;
// guests have no account and never appear here (they're visible via the
// Orders page instead, per architecture.md's guest-has-no-tracking rule).
export async function listClients() {
  const clients = await db.user.findMany({
    where: { role: Role.CLIENT },
    orderBy: { name: "asc" },
    include: {
      orders: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { orders: true } },
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    lastOrderDate: c.orders[0]?.createdAt ?? null,
  }));
}

export async function getClientWithOrders(userId: number) {
  const client = await db.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, isActive: true } },
              variant: { include: { productVariant: { select: { id: true, isActive: true } } } },
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
