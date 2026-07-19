import type { OrderStatusValue } from "@/types/order";

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export const ORDER_TRANSITIONS: Record<
  OrderStatusValue,
  readonly OrderStatusValue[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

export function allowedOrderTransitions(status: OrderStatusValue) {
  return ORDER_TRANSITIONS[status];
}

export function canTransitionOrder(
  from: OrderStatusValue,
  to: OrderStatusValue,
) {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function transitionRestoresStock(
  from: OrderStatusValue,
  to: OrderStatusValue,
) {
  return (
    ((from === "PENDING" || from === "CONFIRMED") && to === "CANCELLED") ||
    ((from === "SHIPPED" || from === "DELIVERED") && to === "RETURNED")
  );
}
