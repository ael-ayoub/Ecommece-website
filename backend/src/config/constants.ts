export const ADMIN_ROLES = ["SUPER_ADMIN", "STAFF"] as const;

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
  "CANCELLED",
] as const;

/** Order statuses that count as "not yet delivered/cancelled" — hold stock_reserved. */
export const ACTIVE_RESERVATION_STATUSES = ["PENDING", "PROCESSING", "SHIPPED"] as const;

/** Allowed forward transitions for an order's status — admin status updates are validated against this. */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURN_REQUESTED", "REFUNDED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: [],
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const OTP_REQUEST_RATE_LIMIT = { max: 3, timeWindowMs: 10 * 60 * 1000 };
export const AUTH_ROUTE_RATE_LIMIT = { max: 10, timeWindowMs: 60 * 1000 };

export const ADMIN_ACCESS_COOKIE = "admin_access_token";
export const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

export const IDEMPOTENCY_HEADER = "idempotency-key";
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
