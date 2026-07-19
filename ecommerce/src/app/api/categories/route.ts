import { NextRequest, NextResponse } from "next/server";
import { listCategories, createCategory } from "@/services/category.service";
import { categorySchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";

export async function GET() {
  try {
    const categories = await listCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await req.json();
    const input = categorySchema.parse(body);
    const category = await createCategory(input);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
