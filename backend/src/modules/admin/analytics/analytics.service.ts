import { adminAnalyticsRepository } from "./analytics.repository.js";
import { adminSettingsRepository } from "../settings/settings.repository.js";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const adminAnalyticsService = {
  async summary() {
    const [today, month] = await Promise.all([
      adminAnalyticsRepository.revenueSince(startOfToday()),
      adminAnalyticsRepository.revenueSince(startOfMonth()),
    ]);

    return {
      today_revenue: today.revenue,
      today_order_count: today.orderCount,
      month_revenue: month.revenue,
    };
  },

  /** Real profit = sum(quantity * (unit_price - unit_cost_price)) minus delivery_cost, delivered orders only. */
  async profit(dateFrom?: Date, dateTo?: Date) {
    const [items, deliveryCostTotal] = await Promise.all([
      adminAnalyticsRepository.deliveredOrderItems(dateFrom, dateTo),
      adminAnalyticsRepository.deliveredOrdersDeliveryCost(dateFrom, dateTo),
    ]);

    const grossMargin = items.reduce((sum, item) => sum + item.quantity * (Number(item.unit_price) - Number(item.unit_cost_price)), 0);

    return {
      gross_margin: grossMargin,
      delivery_cost_total: deliveryCostTotal,
      net_profit: grossMargin - deliveryCostTotal,
    };
  },

  async returns() {
    const counts = await adminAnalyticsRepository.returnCounts();
    return { pending: counts.pending, completed: counts.completed };
  },

  /**
   * Revenue bucketed by day for the last `days` days (oldest first) — plus a week-over-week
   * change percentage, which needs a second window of history to compare against.
   */
  async salesByDay(days = 7) {
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setDate(rangeStart.getDate() - (days * 2 - 1));

    const orders = await adminAnalyticsRepository.ordersSince(rangeStart);

    const buckets = new Map<string, number>();
    for (let i = 0; i < days * 2; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }

    for (const order of orders) {
      const key = order.created_at.toISOString().slice(0, 10);
      const revenue = Number(order.total_amount) + Number(order.delivery_cost);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + revenue);
    }

    const allDays = Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue }));
    const previousPeriod = allDays.slice(0, days);
    const currentPeriod = allDays.slice(days);

    const previousTotal = previousPeriod.reduce((sum, d) => sum + d.revenue, 0);
    const currentTotal = currentPeriod.reduce((sum, d) => sum + d.revenue, 0);
    const changePct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

    return { items: currentPeriod, change_pct: changePct };
  },

  async inventoryHealth() {
    const settings = await adminSettingsRepository.get();
    return adminAnalyticsRepository.inventoryHealth(settings.low_stock_threshold);
  },
};
