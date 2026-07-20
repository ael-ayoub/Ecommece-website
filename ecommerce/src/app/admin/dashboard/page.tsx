"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { KPICard } from "@/components/admin/analytics/KPICard";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { OrdersByStatusChart } from "@/components/admin/analytics/OrdersByStatusChart";
import { RecentOrders } from "@/components/admin/analytics/RecentOrders";
import { formatCurrency } from "@/lib/format";
import type {
  DashboardSummaryDto,
  OrdersByStatusDto,
  RevenuePointDto,
} from "@/types/analytics";

export default function AdminDashboardPage() {
  const {
    data: summary,
    isLoading: loadingSummary,
    isError: summaryError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "analytics", "summary"],
    queryFn: () =>
      apiFetch<DashboardSummaryDto>("/api/admin/analytics/summary"),
  });

  const { data: statusData } = useQuery({
    queryKey: ["admin", "analytics", "orders-by-status"],
    queryFn: () =>
      apiFetch<{ ordersByStatus: OrdersByStatusDto }>(
        "/api/admin/analytics/orders-by-status",
      ),
  });

  const { data: revenueData } = useQuery({
    queryKey: ["admin", "analytics", "revenue-over-time"],
    queryFn: () =>
      apiFetch<{ points: RevenuePointDto[] }>(
        "/api/admin/analytics/revenue-over-time",
      ),
  });

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p>Monitor orders, revenue, and operational activity.</p>
        </div>
        <Link href="/admin/products/new" className="admin-primary-link">
          Create Product
        </Link>
      </div>

      {loadingSummary ? (
        <div
          role="status"
          aria-label="Loading dashboard"
          className="admin-kpi-grid"
        >
          {[1, 2, 3, 4].map((item) => (
            <span key={item} className="admin-skeleton h-28" />
          ))}
        </div>
      ) : summaryError ? (
        <section role="alert" className="admin-alert admin-alert-danger">
          <strong>Dashboard data is unavailable</strong>
          <p>Check the connection and try loading the overview again.</p>
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </section>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <KPICard
              label="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? "0")}
            />
            <KPICard
              label="Delivered"
              value={summary?.deliveredCount ?? 0}
              tone="success"
            />
            <KPICard
              label="Pending"
              value={summary?.pendingCount ?? 0}
              tone="warning"
            />
            <KPICard
              label="Cancelled"
              value={summary?.cancelledCount ?? 0}
              tone="danger"
            />
          </div>

          <div className="admin-chart-grid">
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-eyebrow">Performance</p>
                  <h2>Revenue over time</h2>
                </div>
              </div>
              <RevenueChart points={revenueData?.points ?? []} />
            </section>
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-eyebrow">Operations</p>
                  <h2>Orders by status</h2>
                </div>
              </div>
              {statusData && (
                <OrdersByStatusChart counts={statusData.ordersByStatus} />
              )}
            </section>
          </div>

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <p className="admin-eyebrow">Latest</p>
                <h2>Recent activity</h2>
              </div>
              <Link href="/admin/orders" className="admin-secondary-link">
                View all orders
              </Link>
            </div>
            <RecentOrders orders={summary?.recentOrders ?? []} />
          </section>
        </>
      )}
    </div>
  );
}
