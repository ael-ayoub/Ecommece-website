"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/constants/order-status";
import type { OrdersByStatusDto } from "@/types/analytics";

// Same six-color palette as StatusBadge — locked in admin-dashboard-spec.md §9.
const BAR_COLORS: Record<string, string> = {
  PENDING: "#ca8a04",
  CONFIRMED: "#2563eb",
  SHIPPED: "#9333ea",
  DELIVERED: "#16a34a",
  RETURNED: "#ea580c",
  CANCELLED: "#dc2626",
};

export function OrdersByStatusChart({ counts }: { counts: OrdersByStatusDto }) {
  const data = ORDER_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    count: counts[status] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count">
          {data.map((entry) => (
            <Cell key={entry.status} fill={BAR_COLORS[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
