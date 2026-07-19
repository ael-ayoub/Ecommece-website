"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import { Button } from "@/components/ui/button";
import type { OrderDto } from "@/types/order";

interface Props {
  params: { id: string };
}

export default function OrderDetailPage({ params }: Props) {
  const orderId = params.id;
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("justPlaced") === "1";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<{ order: OrderDto }>(`/api/orders/${orderId}`),
  });

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleCancel() {
    setCancelError(null);
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, { method: "PUT" });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setConfirmingCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p className="text-red-600">Order not found.</p>;

  const { order } = data;

  return (
    <div className="max-w-2xl">
      {justPlaced && (
        <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">✓ Thank you for your order!</p>
          <p>You can track your order status anytime here in My Orders.</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Placed: {new Date(order.createdAt).toLocaleString()}
      </p>

      <div className="mb-8">
        <OrderStatusTimeline status={order.status} />
      </div>

      <OrderItemsTable items={order.items} total={order.totalAmount} />

      <p className="mt-4 text-sm text-gray-600">Delivery Address: {order.shippingAddress}</p>

      {order.status === "PENDING" && (
        <div className="mt-6">
          {cancelError && <p className="mb-2 text-sm text-red-600">{cancelError}</p>}
          {!confirmingCancel ? (
            <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancel Order
            </Button>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="mb-3 text-sm">
                Cancel this order? Stock will be restored. You can place a new order anytime.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmingCancel(false)}>
                  Go Back
                </Button>
                <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? "Cancelling…" : "Yes, Cancel Order"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/orders" className="mt-8 inline-block text-sm underline">
        ← Back to Orders
      </Link>
    </div>
  );
}
