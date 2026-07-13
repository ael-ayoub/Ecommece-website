import { NextRequest, NextResponse } from "next/server";
import { listOrdersAdmin } from "@/services/order.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import type { OrderStatusValue } from "@/types/order";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const orders = await listOrdersAdmin({
      status: (searchParams.get("status") as OrderStatusValue) || undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") === "price" ? "price" : "date",
      sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc",
    });

    return NextResponse.json({ orders });
  } catch (err) {
    return handleApiError(err);
  }
}
