export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED"
  | "CANCELLED";

// Pending/processing/shipped/delivered colors match the design reference exactly;
// the remaining statuses (not shown in the mockup) extend the same pattern.
const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-gray-200 text-gray-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  SHIPPED: "bg-green-100 text-green-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURNED: "bg-blue-100 text-blue-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
