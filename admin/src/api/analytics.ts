import { apiRequest } from "./client";

export interface AnalyticsSummary {
  today_revenue: number;
  today_order_count: number;
  month_revenue: number;
}

export interface AnalyticsProfit {
  gross_margin: number;
  delivery_cost_total: number;
  net_profit: number;
}

export interface SalesByDayPoint {
  date: string;
  revenue: number;
}

export interface InventoryHealth {
  inStockUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export function getSummary() {
  return apiRequest<AnalyticsSummary>("/admin/analytics/summary");
}

export function getProfit() {
  return apiRequest<AnalyticsProfit>("/admin/analytics/profit");
}

export function getSalesByDay() {
  return apiRequest<{ items: SalesByDayPoint[]; change_pct: number | null }>("/admin/analytics/sales-by-day");
}

export function getInventoryHealth() {
  return apiRequest<InventoryHealth>("/admin/analytics/inventory-health");
}
