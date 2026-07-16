import { NextRequest, NextResponse } from "next/server";
import { updateVariant } from "@/services/product.service";
import { variantUpdateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string; variantId: string };
}

// Handles both "edit price/label/stock" and "enable/disable" — both are just
// a partial update of the same variant row, per architecture.md §5's grouping
// of those two admin actions under one resource.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = variantUpdateSchema.parse(body);
    const variant = await updateVariant(Number(params.id), Number(params.variantId), input);
    return NextResponse.json({ variant });
  } catch (err) {
    return handleApiError(err);
  }
}
