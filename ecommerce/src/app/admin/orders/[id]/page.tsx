"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import { Button } from "@/components/ui/button";
import {
  getAdminOrderTransitions,
  ORDER_STATUS_LABELS,
  STOCK_RESTORING_STATUSES,
} from "@/constants/order-status";
import type { OrderDto, OrderStatusValue } from "@/types/order";

interface Props {
  params: { id: string };
}

export default function AdminOrderDetailPage({ params }: Props) {
  const orderId = params.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () =>
      apiFetch<{ order: OrderDto }>(`/api/admin/orders/${orderId}`),
  });

  const [pendingStatus, setPendingStatus] = useState<OrderStatusValue | null>(
    null,
  );
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyStatus(status: OrderStatusValue) {
    setError(null);
    setUpdating(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
      setPendingStatus(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update order status.",
      );
    } finally {
      setUpdating(false);
    }
  }

  function handleStatusClick(status: OrderStatusValue) {
    // Destructive/stock-restoring transitions require an explicit
    // confirmation step (admin-dashboard-spec.md §9) — everything else
    // (Confirmed/Shipped/Delivered) applies immediately.
    if (STOCK_RESTORING_STATUSES.includes(status)) {
      setPendingStatus(status);
    } else {
      applyStatus(status);
    }
  }

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p className="text-red-600">Order not found.</p>;

  const { order } = data;
  const restoreUnits = order.items.reduce(
    (sum, item) => sum + (item.variant?.quantity ?? 0),
    0,
  );
  const allowedNext = getAdminOrderTransitions(order.status);

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/orders"
        className="mb-4 inline-block text-sm underline"
      >
        ← Back to Orders
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6 text-sm text-gray-600">
        <p>Placed: {new Date(order.createdAt).toLocaleString()}</p>
        <p>
          {order.user ? (
            <>
              Registered customer —{" "}
              <Link
                href={`/admin/clients/${order.user.id}`}
                className="underline"
              >
                {order.contactName}
              </Link>
            </>
          ) : order.customerAccountIdSnapshot ? (
            <>
              {order.contactName} ·{" "}
              <span className="text-gray-500">Customer was deleted</span>
            </>
          ) : (
            <>Guest — {order.contactName}</>
          )}{" "}
          · {order.contactEmail} · {order.contactPhone}
        </p>
        <p>Delivery Address: {order.shippingAddress}</p>
        <p>Payment: Cash on Delivery</p>
      </div>

      <div className="mb-8">
        <OrderStatusTimeline status={order.status} />
      </div>

      <OrderItemsTable
        items={order.items}
        total={order.totalAmount}
        productLinkBase="/admin/products"
      />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {pendingStatus ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm">
            Marking this order as {ORDER_STATUS_LABELS[pendingStatus]} will
            restore {restoreUnits} unit{restoreUnits === 1 ? "" : "s"} to stock
            across {order.items.length} item
            {order.items.length === 1 ? "" : "s"}. Continue?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPendingStatus(null)}>
              Go Back
            </Button>
            <Button
              variant="danger"
              onClick={() => applyStatus(pendingStatus)}
              disabled={updating}
            >
              {updating
                ? "Updating…"
                : `Yes, Mark ${ORDER_STATUS_LABELS[pendingStatus]}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {allowedNext
            .filter((s) => !STOCK_RESTORING_STATUSES.includes(s))
            .map((s) => (
              <Button
                key={s}
                onClick={() => handleStatusClick(s)}
                disabled={updating}
              >
                Mark {ORDER_STATUS_LABELS[s]}
              </Button>
            ))}
          {allowedNext
            .filter((s) => STOCK_RESTORING_STATUSES.includes(s))
            .map((s) => (
              <Button
                key={s}
                variant="danger"
                onClick={() => handleStatusClick(s)}
                disabled={updating}
              >
                Mark {ORDER_STATUS_LABELS[s]}
              </Button>
            ))}
          {allowedNext.length === 0 && (
            <p className="text-sm text-gray-500">
              This order is in a terminal state — no further changes possible.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
