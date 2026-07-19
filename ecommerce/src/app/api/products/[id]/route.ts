import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  permanentlyDeleteProduct,
  updateProduct,
} from "@/services/product.service";
import { productUpdateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    // Admins can open a disabled (soft-deleted) product's edit page; the
    // public detail page never sees inactive products (404s instead).
    const user = await getCurrentUser();
    const product = await getProductById(Number(params.id), {
      includeInactive: user?.role === "ADMIN",
    });
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await req.json();
    const input = productUpdateSchema.parse(body);
    const product = await updateProduct(Number(params.id), input);
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await permanentlyDeleteProduct(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
