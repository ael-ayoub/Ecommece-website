import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";

export function StatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
