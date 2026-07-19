"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  STOCK_RESTORING_STATUSES,
  getAdminOrderTransitions,
} from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";

interface Props {
  orderId: number;
  status: OrderStatusValue;
}

// Inline status-change control for the Orders list — lets an admin change an
// order's status directly from the row, without opening the order detail
// page. Cancelled/Returned still get a native confirm() since those restore
// stock (mirrors the confirmation step on the order detail page).
export function OrderStatusSelect({ orderId, status }: Props) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: OrderStatusValue) {
    if (next === status) return;

    if (
      STOCK_RESTORING_STATUSES.includes(next) &&
      !window.confirm(
        `Mark this order as ${ORDER_STATUS_LABELS[next]}? This will restore its items to stock.`,
      )
    ) {
      return;
    }

    setError(null);
    setUpdating(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order", String(orderId)] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="inline-block text-left">
      <select
        value={status}
        disabled={updating}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleChange(e.target.value as OrderStatusValue)}
        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${ORDER_STATUS_COLORS[status]}`}
      >
        <option value={status}>{ORDER_STATUS_LABELS[status]}</option>
        {getAdminOrderTransitions(status).map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
