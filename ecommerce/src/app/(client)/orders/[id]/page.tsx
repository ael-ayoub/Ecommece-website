"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, Check, RefreshCw, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import { Button } from "@/components/ui/button";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { ClientOrderStatus } from "@/components/orders/ClientOrderStatus";
import type { OrderDto } from "@/types/order";

interface Props {
  params: { id: string };
}

export default function OrderDetailPage({ params }: Props) {
  const orderId = params.id;
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("justPlaced") === "1";
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
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
      setCancelError(
        err instanceof Error ? err.message : "Failed to cancel order.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading)
    return (
      <main className="client-container py-10">
        <div
          role="status"
          aria-label="Loading order"
          className="h-72 animate-pulse rounded-2xl bg-[var(--client-surface-muted)] motion-reduce:animate-none"
        >
          <span className="sr-only">Loading order…</span>
        </div>
      </main>
    );
  if (isError || !data)
    return (
      <main className="client-container py-10 sm:py-14">
        <AccountNavigation />
        <section
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <h1 className="text-xl font-bold text-red-900">Order unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-red-800">
            This order does not exist, does not belong to this account, or your
            session has expired.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="client-button-secondary"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              Retry
            </button>
            <Link href="/orders" className="client-button-primary">
              My Orders
            </Link>
          </div>
        </section>
      </main>
    );

  const { order } = data;

  return (
    <main className="client-container py-10 sm:py-14">
      <AccountNavigation />
      {justPlaced && (
        <section
          aria-labelledby="order-confirmed-heading"
          className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900 sm:p-6"
        >
          <span className="grid size-11 place-items-center rounded-full bg-white text-[var(--client-success)] shadow-sm">
            <Check aria-hidden="true" className="size-6" />
          </span>
          <p className="client-eyebrow mt-5 text-[var(--client-success)]">
            Order confirmed
          </p>
          <h1 id="order-confirmed-heading" className="mt-2 text-2xl font-bold">
            Thank you for your order
          </h1>
          <p className="mt-2 text-sm leading-6">
            Order #{orderId} was confirmed by the server. You can follow its
            status from My Orders.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/orders" className="client-button-primary">
              <ShoppingBag aria-hidden="true" className="size-4" />
              My Orders
            </Link>
            <Link href="/products" className="client-button-secondary">
              Continue shopping
            </Link>
          </div>
        </section>
      )}

      <section className="mt-8 max-w-4xl rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <ClientOrderStatus status={order.status} />
        </div>
        <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
          Placed: {new Date(order.createdAt).toLocaleString()}
        </p>

        <div className="my-8 overflow-x-auto pb-2">
          <OrderStatusTimeline status={order.status} />
        </div>

        <div className="overflow-x-auto pb-2">
          <OrderItemsTable items={order.items} total={order.totalAmount} />
        </div>

        <p className="mt-6 text-sm leading-6 text-[var(--client-text-secondary)]">
          <span className="font-semibold text-[var(--client-text-primary)]">
            Delivery address:
          </span>{" "}
          {order.shippingAddress}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm font-medium">
          <Banknote aria-hidden="true" className="size-4" />
          Payment: Cash on Delivery
        </p>

        {order.status === "PENDING" && (
          <div className="mt-6">
            {cancelError && (
              <p role="alert" className="mb-2 text-sm text-red-700">
                {cancelError}
              </p>
            )}
            {!confirmingCancel ? (
              <Button
                variant="danger"
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel Order
              </Button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-sm">
                  Cancel this order? Stock will be restored. You can place a new
                  order anytime.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmingCancel(false)}
                  >
                    Go Back
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
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
      </section>
    </main>
  );
}
