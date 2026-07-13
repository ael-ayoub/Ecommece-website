import { NextRequest, NextResponse } from "next/server";
import { updateCategory, deleteCategory } from "@/services/category.service";
import { categorySchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = categorySchema.parse(body);
    const category = await updateCategory(Number(params.id), input);
    return NextResponse.json({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await deleteCategory(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
