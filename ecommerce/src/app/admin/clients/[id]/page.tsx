"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/format";
import type { ClientDetailDto } from "@/types/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default function AdminClientDetailPage({ params }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "client", params.id],
    queryFn: () =>
      apiFetch<{ client: ClientDetailDto }>(`/api/admin/clients/${params.id}`),
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data?.client) return;
    setName(data.client.name);
    setEmail(data.client.email);
    setPhone(data.client.phone);
  }, [data]);

  async function updateClient(changes: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/clients/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(changes),
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "client", params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      setEditing(false);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Customer update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteClient() {
    const confirmation = prompt(
      `Permanently delete "${data?.client.email}"?\n\nThe account will be removed. Historical terminal orders will remain unchanged. Customers with active orders cannot be deleted.\n\nType the customer email to confirm:`,
    );
    if (!data || confirmation !== data.client.email) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/clients/${params.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      router.push("/admin/clients");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Customer deletion failed.",
      );
      setBusy(false);
    }
  }

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p className="text-red-600">Client not found.</p>;

  const { client } = data;

  return (
    <div className="max-w-6xl">
      <Link
        href="/admin/clients"
        className="mb-4 inline-block text-sm underline"
      >
        ← Back to Clients
      </Link>

      <div className="admin-card mb-6">
        {editing ? (
          <div className="space-y-3">
            <label className="block text-sm">
              Name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Email
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Phone
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => updateClient({ name, email, phone })}
                disabled={busy}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="mb-1 text-xl font-bold">{client.name}</h1>
                <p className="text-sm text-gray-600">
                  {client.email} · {client.phone} · Joined{" "}
                  {new Date(client.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm font-medium">
                  Status: {client.isActive ? "Active" : "Disabled"}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => updateClient({ isActive: !client.isActive })}
              >
                {client.isActive ? "Disable customer" : "Activate customer"}
              </Button>
              <Button variant="danger" disabled={busy} onClick={deleteClient}>
                Delete permanently
              </Button>
            </div>
          </>
        )}
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>

      <h2 className="mb-3 font-semibold">Order History and Activity</h2>
      {client.orders.length === 0 ? (
        <p className="text-sm text-gray-500">
          This client hasn&apos;t placed any orders yet.
        </p>
      ) : (
        <div className="admin-table-scroll">
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
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
