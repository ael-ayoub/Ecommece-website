import { NextRequest, NextResponse } from "next/server";
import { getClientWithOrders } from "@/services/user.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const client = await getClientWithOrders(Number(params.id));
    return NextResponse.json({ client });
  } catch (err) {
    return handleApiError(err);
  }
}
