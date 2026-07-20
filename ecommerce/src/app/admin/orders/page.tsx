"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { OrderStatusSelect } from "@/components/admin/orders/OrderStatusSelect";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/constants/order-status";
import type { OrderDto, OrderStatusValue } from "@/types/order";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatusValue | "">("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, search, sortBy, sortDir],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      return apiFetch<{ orders: OrderDto[] }>(
        `/api/admin/orders?${params.toString()}`,
      );
    },
  });

  function toggleSort(field: "date" | "price") {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h1>Orders</h1>
          <p>
            Review purchases and move orders through the existing lifecycle.
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div>
          <label className="mb-1 block text-xs font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatusValue | "")}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          >
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Client search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : !data || data.orders.length === 0 ? (
        <p className="text-gray-500">
          No orders found. Try adjusting your filters.
        </p>
      ) : (
        <div className="admin-table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th scope="col" className="py-2">
                  Order
                </th>
                <th scope="col">Client / Contact</th>
                <th scope="col">
                  <button
                    onClick={() => toggleSort("date")}
                    className="hover:underline"
                  >
                    Date {sortBy === "date" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th scope="col">
                  <button
                    onClick={() => toggleSort("price")}
                    className="hover:underline"
                  >
                    Total{" "}
                    {sortBy === "price" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th scope="col" className="text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      #{order.id}
                    </Link>
                  </td>
                  <td>
                    {order.contactName}
                    <div className="text-xs text-gray-500">
                      {order.userId
                        ? order.contactEmail
                        : `Guest — ${order.contactEmail}`}
                    </div>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td className="text-right">
                    <OrderStatusSelect
                      orderId={order.id}
                      status={order.status}
                    />
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
