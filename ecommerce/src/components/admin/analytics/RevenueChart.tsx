"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenuePointDto } from "@/types/analytics";

export function RevenueChart({ points }: { points: RevenuePointDto[] }) {
  const data = points.map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    revenue: Number(p.revenue),
  }));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No revenue yet — no Delivered orders.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Line type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
