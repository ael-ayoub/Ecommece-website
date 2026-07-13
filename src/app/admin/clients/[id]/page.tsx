"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/format";
import type { ClientDetailDto } from "@/types/client";

interface Props {
  params: { id: string };
}

export default function AdminClientDetailPage({ params }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "client", params.id],
    queryFn: () => apiFetch<{ client: ClientDetailDto }>(`/api/admin/clients/${params.id}`),
  });

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p className="text-red-600">Client not found.</p>;

  const { client } = data;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/clients" className="mb-4 inline-block text-sm underline">
        ← Back to Clients
      </Link>

      <h1 className="mb-1 text-xl font-bold">{client.name}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {client.email} · {client.phone} · Joined {new Date(client.createdAt).toLocaleDateString()}
      </p>

      <h2 className="mb-3 font-semibold">Order History</h2>
      {client.orders.length === 0 ? (
        <p className="text-sm text-gray-500">This client hasn&apos;t placed any orders yet.</p>
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
            {client.orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-100">
                <td className="py-2">#{order.id}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>{formatCurrency(order.totalAmount)}</td>
                <td className="text-right">
                  <Link href={`/admin/orders/${order.id}`} className="underline">
                    View
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
