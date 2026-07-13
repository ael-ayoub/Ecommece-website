import { NextRequest, NextResponse } from "next/server";
import { addVariant } from "@/services/product.service";
import { variantCreateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = variantCreateSchema.parse(body);
    const variant = await addVariant(Number(params.id), input);
    return NextResponse.json({ variant }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
