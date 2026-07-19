import { db } from "@/lib/db";
import { Prisma, OrderStatus } from "@prisma/client";
import { ORDER_STATUSES } from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";

// Dashboard KPI tiles (admin-dashboard-spec.md §3 Section A).
export async function getDashboardSummary() {
  const [revenueResult, deliveredCount, pendingCount, cancelledCount] =
    await Promise.all([
      db.order.aggregate({
        where: { status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),
      db.order.count({ where: { status: OrderStatus.DELIVERED } }),
      db.order.count({ where: { status: OrderStatus.PENDING } }),
      db.order.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

  return {
    totalRevenue: (
      revenueResult._sum.totalAmount ?? new Prisma.Decimal(0)
    ).toFixed(2),
    deliveredCount,
    pendingCount,
    cancelledCount,
  };
}

// Bar/pie chart data — counts for all six statuses, including zero counts
// for statuses with no orders yet (so the chart always shows all six bars).
export async function getOrdersByStatus(): Promise<
  Record<OrderStatusValue, number>
> {
  const grouped = await db.order.groupBy({ by: ["status"], _count: true });
  const counts = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s, 0]),
  ) as Record<OrderStatusValue, number>;
  for (const row of grouped) {
    counts[row.status as OrderStatusValue] = row._count;
  }
  return counts;
}

export type RevenueGranularity = "day" | "week" | "month";

interface RevenuePoint {
  bucket: Date;
  revenue: Prisma.Decimal;
}

// Revenue-over-time line chart — Delivered orders only (architecture.md's
// revenue definition), grouped by day/week/month via Postgres date_trunc.
export async function getRevenueOverTime(
  granularity: RevenueGranularity = "day",
) {
  const unit =
    granularity === "week" ? "week" : granularity === "month" ? "month" : "day";

  const rows = await db.$queryRaw<RevenuePoint[]>`
    SELECT date_trunc(${unit}, "createdAt") AS bucket, SUM("totalAmount") AS revenue
    FROM "Order"
    WHERE status = 'DELIVERED'
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    date: r.bucket.toISOString(),
    revenue: r.revenue.toFixed(2),
  }));
}
