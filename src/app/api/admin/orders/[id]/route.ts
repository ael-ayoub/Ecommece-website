import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/services/order.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const order = await getOrderById(Number(params.id));
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
