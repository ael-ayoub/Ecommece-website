import { NextRequest, NextResponse } from "next/server";
import { getOrderForUser } from "@/services/order.service";
import { requireUser } from "@/lib/guards/require-user";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const order = await getOrderForUser(Number(params.id), user.id);
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
