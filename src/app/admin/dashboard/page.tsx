"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { KPICard } from "@/components/admin/analytics/KPICard";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { OrdersByStatusChart } from "@/components/admin/analytics/OrdersByStatusChart";
import { RecentOrders } from "@/components/admin/analytics/RecentOrders";
import { formatCurrency } from "@/lib/format";
import type { DashboardSummaryDto, OrdersByStatusDto, RevenuePointDto } from "@/types/analytics";

export default function AdminDashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["admin", "analytics", "summary"],
    queryFn: () => apiFetch<DashboardSummaryDto>("/api/admin/analytics/summary"),
  });

  const { data: statusData } = useQuery({
    queryKey: ["admin", "analytics", "orders-by-status"],
    queryFn: () =>
      apiFetch<{ ordersByStatus: OrdersByStatusDto }>("/api/admin/analytics/orders-by-status"),
  });

  const { data: revenueData } = useQuery({
    queryKey: ["admin", "analytics", "revenue-over-time"],
    queryFn: () =>
      apiFetch<{ points: RevenuePointDto[] }>("/api/admin/analytics/revenue-over-time"),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Dashboard</h1>

      {loadingSummary ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPICard label="Total Revenue" value={formatCurrency(summary?.totalRevenue ?? "0")} />
            <KPICard label="Delivered" value={summary?.deliveredCount ?? 0} />
            <KPICard label="Pending" value={summary?.pendingCount ?? 0} />
            <KPICard label="Cancelled" value={summary?.cancelledCount ?? 0} />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 font-semibold">Revenue Over Time</h2>
              <RevenueChart points={revenueData?.points ?? []} />
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 font-semibold">Orders by Status</h2>
              {statusData && <OrdersByStatusChart counts={statusData.ordersByStatus} />}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">Recent Activity</h2>
            <RecentOrders orders={summary?.recentOrders ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
