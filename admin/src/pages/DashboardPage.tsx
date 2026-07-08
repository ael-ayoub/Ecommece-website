import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as analytics from "../api/analytics";
import * as ordersApi from "../api/orders";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
}

function MetricCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="rounded-xl p-stack-lg transition-transform duration-200 hover:scale-[1.02]">
      <p className="mb-2 font-label-md text-label-md text-on-surface-variant">{label}</p>
      {children}
    </Card>
  );
}

function MetricsRow() {
  const summaryQuery = useQuery({ queryKey: ["admin", "analytics", "summary"], queryFn: analytics.getSummary });
  const profitQuery = useQuery({ queryKey: ["admin", "analytics", "profit"], queryFn: analytics.getProfit });
  const inventoryQuery = useQuery({ queryKey: ["admin", "analytics", "inventory-health"], queryFn: analytics.getInventoryHealth });

  if (summaryQuery.isError || profitQuery.isError || inventoryQuery.isError) {
    return (
      <div className="mb-10 grid grid-cols-1 gap-gutter md:grid-cols-5">
        <Card className="md:col-span-5">
          <ErrorState message="Couldn't load dashboard metrics." />
        </Card>
      </div>
    );
  }

  const isLoading = summaryQuery.isLoading || profitQuery.isLoading || inventoryQuery.isLoading;

  return (
    <div className="mb-10 grid grid-cols-1 gap-gutter md:grid-cols-5">
      <MetricCard label="Revenue today">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-headline-lg text-headline-lg text-primary">
            {formatMoney(summaryQuery.data!.today_revenue)} <span className="text-body-md font-medium text-on-surface-variant">MAD</span>
          </p>
        )}
      </MetricCard>

      <MetricCard label="Orders today">
        {isLoading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="font-headline-lg text-headline-lg text-primary">{summaryQuery.data!.today_order_count}</p>
        )}
      </MetricCard>

      <MetricCard label="Revenue this month">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="font-headline-lg text-headline-lg text-primary">
            {formatMoney(summaryQuery.data!.month_revenue)} <span className="text-body-md font-medium text-on-surface-variant">MAD</span>
          </p>
        )}
      </MetricCard>

      <MetricCard label="Real profit (delivered)">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="font-headline-lg text-headline-lg text-primary">
            {formatMoney(profitQuery.data!.net_profit)} <span className="text-body-md font-medium text-on-surface-variant">MAD</span>
          </p>
        )}
      </MetricCard>

      <MetricCard label="Low stock items">
        {isLoading ? (
          <Skeleton className="h-8 w-10" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="font-headline-lg text-headline-lg text-amber-600">{inventoryQuery.data!.lowStockCount}</p>
            {inventoryQuery.data!.lowStockCount > 0 && (
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
            )}
          </div>
        )}
      </MetricCard>
    </div>
  );
}

function RecentOrdersCard() {
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", "recent"],
    queryFn: () => ordersApi.listOrders({ page: 1, pageSize: 5 }),
  });

  return (
    <Card className="overflow-hidden rounded-xl !p-0">
      <div className="flex items-center justify-between border-b border-outline-variant px-stack-lg py-stack-md">
        <h3 className="font-headline-md text-headline-md text-primary">Recent orders</h3>
        <Link to="/orders" className="font-label-md text-label-md text-primary decoration-2 underline-offset-4 hover:underline">
          View all orders
        </Link>
      </div>

      {ordersQuery.isLoading ? (
        <div className="space-y-4 p-stack-lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : ordersQuery.isError ? (
        <ErrorState message="Couldn't load recent orders." />
      ) : ordersQuery.data!.items.length === 0 ? (
        <EmptyState icon="receipt_long" message="No orders yet." />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Order ID</th>
              <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Customer</th>
              <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Total Amount</th>
              <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Status</th>
              <th className="px-stack-lg py-3 text-right font-label-md text-label-md text-on-surface-variant">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {ordersQuery.data!.items.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-surface-container-lowest">
                <td className="px-stack-lg py-4 font-body-md text-body-md text-primary">#{order.id.slice(0, 6)}</td>
                <td className="px-stack-lg py-4 font-body-md text-body-md text-on-surface">{order.customer_name}</td>
                <td className="px-stack-lg py-4 font-body-md text-body-md font-semibold">
                  {formatMoney(order.total_amount)} MAD
                </td>
                <td className="px-stack-lg py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-stack-lg py-4 text-right">
                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function InventoryHealthCard() {
  const inventoryQuery = useQuery({ queryKey: ["admin", "analytics", "inventory-health"], queryFn: analytics.getInventoryHealth });

  return (
    <Card className="rounded-xl md:col-span-1">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="text-[18px] font-headline-md">Inventory Health</h4>
        <span className="material-symbols-outlined text-on-surface-variant">analytics</span>
      </div>

      {inventoryQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : inventoryQuery.isError ? (
        <ErrorState message="Couldn't load inventory health." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-body-md text-on-surface-variant">In Stock</span>
            <span className="font-semibold text-primary">{inventoryQuery.data!.inStockUnits.toLocaleString()} items</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(
                  100,
                  (inventoryQuery.data!.inStockUnits / Math.max(1, inventoryQuery.data!.inStockUnits + inventoryQuery.data!.outOfStockCount * 10)) * 100,
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-body-md text-on-surface-variant">Out of Stock</span>
            <span className="font-semibold text-error">{inventoryQuery.data!.outOfStockCount} items</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function PerformanceOverviewCard() {
  const salesQuery = useQuery({ queryKey: ["admin", "analytics", "sales-by-day"], queryFn: analytics.getSalesByDay });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="relative overflow-hidden rounded-xl md:col-span-2">
      <h4 className="mb-1 text-[18px] font-headline-md">Performance overview</h4>

      {salesQuery.isLoading ? (
        <div className="mt-6 flex h-32 items-end gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-full w-full" />
          ))}
        </div>
      ) : salesQuery.isError ? (
        <ErrorState message="Couldn't load performance data." />
      ) : (
        <>
          <p className="mb-6 text-body-md text-on-surface-variant">
            {salesQuery.data!.change_pct === null
              ? "Not enough history yet to compare with last week."
              : `Sales volume ${salesQuery.data!.change_pct >= 0 ? "increased" : "decreased"} by ${Math.abs(
                  Math.round(salesQuery.data!.change_pct),
                )}% compared to last week.`}
          </p>
          <div className="flex h-32 items-end gap-2">
            {salesQuery.data!.items.map((point, i) => {
              const max = Math.max(...salesQuery.data!.items.map((p) => p.revenue), 1);
              const isToday = i === salesQuery.data!.items.length - 1;
              return (
                <div
                  key={point.date}
                  className={`w-full rounded-t-sm ${isToday ? "bg-primary-container" : "bg-primary-container/20"}`}
                  style={{ height: `${Math.max(4, (point.revenue / max) * 100)}%` }}
                  title={`${point.date}: ${formatMoney(point.revenue)} MAD`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-tighter text-on-surface-variant">
            {salesQuery.data!.items.map((point, i) => {
              const isToday = i === salesQuery.data!.items.length - 1;
              return (
                <span key={point.date} className={isToday ? "text-primary" : ""}>
                  {dayLabels[new Date(point.date).getDay()]}
                </span>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

export function DashboardPage() {
  return (
    <div>
      <MetricsRow />
      <RecentOrdersCard />
      <div className="mt-gutter grid grid-cols-1 gap-gutter md:grid-cols-3">
        <InventoryHealthCard />
        <PerformanceOverviewCard />
      </div>
    </div>
  );
}
