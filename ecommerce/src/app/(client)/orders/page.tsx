"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { OrderDto } from "@/types/order";

export default function MyOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => apiFetch<{ orders: OrderDto[] }>("/api/orders"),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

      {isLoading ? (
        <p>Loading…</p>
      ) : !data || data.orders.length === 0 ? (
        <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Order</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-100">
                <td className="py-2">#{order.id}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>{formatCurrency(order.totalAmount)}</td>
                <td className="text-right">
                  <Link href={`/orders/${order.id}`} className="underline">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
