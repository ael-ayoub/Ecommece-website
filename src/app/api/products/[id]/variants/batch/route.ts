import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { assertSameOrigin } from "@/lib/security/origin";
import { handleApiError } from "@/lib/errors";
import { variantBatchUpdateSchema } from "@/lib/validators";
import { batchUpdateVariants } from "@/services/product.service";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const input = variantBatchUpdateSchema.parse(await req.json());
    const variants = await batchUpdateVariants(Number(params.id), input);
    return NextResponse.json({ variants });
  } catch (error) {
    return handleApiError(error);
  }
}
