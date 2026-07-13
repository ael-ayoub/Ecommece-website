import type { OrderStatusValue } from "@/types/order";

// Single source of truth for the six locked order statuses' labels, colors,
// and forward-progression order — read by every place a status is displayed
// (badges, timelines) so a future color/label change is a one-file edit.
export const ORDER_STATUSES: OrderStatusValue[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

// Tailwind classes per architecture/admin-dashboard-spec.md's locked palette.
export const ORDER_STATUS_COLORS: Record<OrderStatusValue, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
};

// The forward path a non-terminal order progresses through, for the timeline UI.
export const ORDER_FORWARD_PATH: OrderStatusValue[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

// Admin transition table — the exact matrix from architecture.md §3.2, not a
// looser "anything before Delivered" rule. In particular: Cancelled is only
// reachable from Pending/Confirmed (pre-shipment); Returned is only reachable
// from Shipped/Delivered (post-shipment) — a shipped order is "returned," not
// "cancelled." Cancelled and Returned are terminal (empty transition lists).
export const ADMIN_ORDER_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

// Transitions that restore stock — shared by the UI (to decide whether to
// show the "this will restore N units" confirmation) and the service layer.
export const STOCK_RESTORING_STATUSES: OrderStatusValue[] = ["CANCELLED", "RETURNED"];
