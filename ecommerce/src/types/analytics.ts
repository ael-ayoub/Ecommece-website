import type { OrderDto, OrderStatusValue } from "@/types/order";

export interface DashboardSummaryDto {
  totalRevenue: string;
  deliveredCount: number;
  pendingCount: number;
  cancelledCount: number;
  recentOrders: OrderDto[];
}

export type OrdersByStatusDto = Record<OrderStatusValue, number>;

export interface RevenuePointDto {
  date: string;
  revenue: string;
}
