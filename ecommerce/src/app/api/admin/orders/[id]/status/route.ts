import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatusAsAdmin } from "@/services/order.service";
import { orderStatusUpdateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { status } = orderStatusUpdateSchema.parse(body);
    const order = await updateOrderStatusAsAdmin(
      Number(params.id),
      status,
      admin.id,
    );
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
