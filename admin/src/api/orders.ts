import { apiRequest } from "./client";
import type { OrderStatus } from "../components/StatusBadge";

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost_price: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_phone_home: string | null;
  guest_phone_personal: string | null;
  guest_address: string | null;
  guest_email: string | null;
  status: OrderStatus;
  delivery_cost: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
}

export function listOrders(params: ListOrdersParams = {}) {
  return apiRequest<{ items: Order[]; meta: PaginationMeta }>("/admin/orders", {
    query: params as Record<string, string | number | boolean | undefined>,
  });
}

export function getOrder(id: string) {
  return apiRequest<Order>(`/admin/orders/${id}`);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return apiRequest<Order>(`/admin/orders/${id}/status`, { method: "PUT", body: { status } });
}
