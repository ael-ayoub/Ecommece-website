import { adminAnalyticsRepository } from "./analytics.repository.js";

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
};
