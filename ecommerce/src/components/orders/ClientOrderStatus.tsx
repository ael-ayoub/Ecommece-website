import { ORDER_STATUS_LABELS } from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";

const tones: Record<OrderStatusValue, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-800",
  SHIPPED: "border-violet-200 bg-violet-50 text-violet-800",
  DELIVERED: "border-green-200 bg-green-50 text-green-800",
  RETURNED: "border-red-200 bg-red-50 text-red-800",
  CANCELLED: "border-gray-200 bg-gray-100 text-gray-700",
};

export function ClientOrderStatus({ status }: { status: OrderStatusValue }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
