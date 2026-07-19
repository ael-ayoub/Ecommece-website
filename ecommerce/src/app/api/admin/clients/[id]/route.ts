import { NextRequest, NextResponse } from "next/server";
import {
  getClientWithOrders,
  permanentlyDeleteClient,
  updateClient,
} from "@/services/user.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { clientUpdateSchema } from "@/lib/validators";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const input = clientUpdateSchema.parse(await req.json());
    const client = await updateClient(Number(params.id), input);
    return NextResponse.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await permanentlyDeleteClient(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
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
