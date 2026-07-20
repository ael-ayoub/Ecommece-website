import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { assertSameOrigin } from "@/lib/security/origin";
import { handleApiError } from "@/lib/errors";
import { productImageReorderSchema } from "@/lib/validators";
import { reorderProductImages } from "@/services/product-image.service";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const input = productImageReorderSchema.parse(await req.json());
    const images = await reorderProductImages(
      Number(params.id),
      input.imageIds,
    );
    return NextResponse.json({ images });
  } catch (error) {
    return handleApiError(error);
  }
}
