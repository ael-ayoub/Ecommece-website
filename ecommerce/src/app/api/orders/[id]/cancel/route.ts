import { NextRequest, NextResponse } from "next/server";
import { cancelOrderAsOwner } from "@/services/order.service";
import { requireUser } from "@/lib/guards/require-user";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const order = await cancelOrderAsOwner(Number(params.id), user.id);
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
