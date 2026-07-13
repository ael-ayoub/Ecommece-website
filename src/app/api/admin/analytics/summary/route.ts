import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/services/analytics.service";
import { listRecentOrders } from "@/services/order.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    const [summary, recentOrders] = await Promise.all([
      getDashboardSummary(),
      listRecentOrders(10),
    ]);
    return NextResponse.json({ ...summary, recentOrders });
  } catch (err) {
    return handleApiError(err);
  }
}
