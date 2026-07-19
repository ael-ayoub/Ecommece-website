"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ClientListItemDto } from "@/types/client";

export default function AdminClientsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: () => apiFetch<{ clients: ClientListItemDto[] }>("/api/admin/clients"),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Clients</h1>

      {isLoading ? (
        <p>Loading…</p>
      ) : !data || data.clients.length === 0 ? (
        <p className="text-gray-500">No registered clients yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Last Order</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((client) => (
              <tr
                key={client.id}
                onClick={() => router.push(`/admin/clients/${client.id}`)}
                className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2">{client.name}</td>
                <td>{client.email}</td>
                <td>{client.phone}</td>
                <td>{client.orderCount}</td>
                <td>
                  {client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
