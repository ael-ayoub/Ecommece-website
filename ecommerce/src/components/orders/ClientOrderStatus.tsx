import { ORDER_STATUS_LABELS } from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";
import {
  Ban,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";

const tones: Record<OrderStatusValue, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-800",
  SHIPPED: "border-violet-200 bg-violet-50 text-violet-800",
  DELIVERED: "border-green-200 bg-green-50 text-green-800",
  RETURNED: "border-red-200 bg-red-50 text-red-800",
  CANCELLED: "border-gray-200 bg-gray-100 text-gray-700",
};

const icons = {
  PENDING: Clock3,
  CONFIRMED: CheckCircle2,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
  RETURNED: RotateCcw,
  CANCELLED: Ban,
} satisfies Record<OrderStatusValue, typeof Clock3>;

export function ClientOrderStatus({ status }: { status: OrderStatusValue }) {
  const Icon = icons[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[status]}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
