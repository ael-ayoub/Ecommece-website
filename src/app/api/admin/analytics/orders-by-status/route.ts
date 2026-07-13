import { NextResponse } from "next/server";
import { getOrdersByStatus } from "@/services/analytics.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    const ordersByStatus = await getOrdersByStatus();
    return NextResponse.json({ ordersByStatus });
  } catch (err) {
    return handleApiError(err);
  }
}
