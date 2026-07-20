import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { assertSameOrigin } from "@/lib/security/origin";
import { handleApiError } from "@/lib/errors";
import { productImageUpdateSchema } from "@/lib/validators";
import {
  deleteProductImage,
  updateProductImage,
} from "@/services/product-image.service";

interface Params {
  params: { id: string; imageId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const input = productImageUpdateSchema.parse(await req.json());
    const image = await updateProductImage(
      Number(params.id),
      Number(params.imageId),
      input,
    );
    return NextResponse.json({ image });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await deleteProductImage(Number(params.id), Number(params.imageId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
