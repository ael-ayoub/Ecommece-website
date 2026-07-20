"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PackageSearch, RefreshCw } from "lucide-react";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { ClientOrderStatus } from "@/components/orders/ClientOrderStatus";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { OrderDto } from "@/types/order";

export default function MyOrdersPage() {
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => apiFetch<{ orders: OrderDto[] }>("/api/orders"),
  });
  return (
    <main className="client-container py-10 sm:py-14">
      <AccountNavigation />
      <header className="mt-8">
        <p className="client-eyebrow">Your account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
          Review orders placed while signed in and open their saved details.
        </p>
      </header>
      {isLoading ? (
        <OrdersSkeleton />
      ) : isError ? (
        <section
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <h2 className="font-bold text-red-900">
            {error instanceof ApiClientError && error.status === 401
              ? "Your session has expired"
              : "We couldn’t load your orders"}
          </h2>
          <p className="mt-2 text-sm text-red-800">
            {error instanceof ApiClientError && error.status === 401
              ? "Log in again to securely return to My Orders."
              : "Check your connection and retry this request."}
          </p>
          {error instanceof ApiClientError && error.status === 401 ? (
            <Link
              href="/login?redirect=%2Forders"
              className="client-button-primary mt-5"
            >
              Log in
            </Link>
          ) : (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="client-button-secondary mt-5"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              Retry
            </button>
          )}
        </section>
      ) : !data?.orders.length ? (
        <section className="mt-8 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-8 text-center">
          <PackageSearch
            aria-hidden="true"
            className="mx-auto size-10 text-[var(--client-text-secondary)]"
          />
          <h2 className="mt-4 text-xl font-bold">No orders yet</h2>
          <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
            When you place an order while signed in, it will appear here.
          </p>
          <Link href="/products" className="client-button-primary mt-6">
            Browse products
          </Link>
        </section>
      ) : (
        <ol className="mt-8 grid gap-4">
          {data.orders.map((order) => (
            <li key={order.id}>
              <article className="grid gap-5 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-bold">Order #{order.id}</h2>
                    <ClientOrderStatus status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
                    {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <Link
                  href={`/orders/${order.id}`}
                  aria-label={`View details for order ${order.id}`}
                  className="client-button-secondary w-full sm:w-auto"
                >
                  View details
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-label="Loading orders" role="status" className="mt-8 space-y-4">
      <span className="sr-only">Loading orders…</span>
      {[1, 2].map((key) => (
        <div
          key={key}
          className="h-32 animate-pulse rounded-2xl bg-[var(--client-surface-muted)] motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
