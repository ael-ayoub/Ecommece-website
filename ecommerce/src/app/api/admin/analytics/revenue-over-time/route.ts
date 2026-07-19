import { NextRequest, NextResponse } from "next/server";
import {
  getRevenueOverTime,
  type RevenueGranularity,
} from "@/services/analytics.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const granularity =
      (searchParams.get("granularity") as RevenueGranularity) || "day";
    const points = await getRevenueOverTime(granularity);
    return NextResponse.json({ points });
  } catch (err) {
    return handleApiError(err);
  }
}
