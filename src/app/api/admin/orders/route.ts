import { NextRequest, NextResponse } from "next/server";
import { listOrdersAdmin } from "@/services/order.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import type { OrderStatusValue } from "@/types/order";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const { page, pageSize } = parsePagination(
      searchParams.get("page"),
      searchParams.get("pageSize"),
    );
    const result = await listOrdersAdmin({
      status: (searchParams.get("status") as OrderStatusValue) || undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") === "price" ? "price" : "date",
      sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc",
      page,
      pageSize,
    });

    return NextResponse.json({
      data: result.data,
      orders: result.data,
      pagination: paginationMeta(page, pageSize, result.totalItems),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
