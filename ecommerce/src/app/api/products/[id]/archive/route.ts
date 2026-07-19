import { NextRequest, NextResponse } from "next/server";
import { archiveProduct } from "@/services/product.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const product = await archiveProduct(Number(params.id));
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
