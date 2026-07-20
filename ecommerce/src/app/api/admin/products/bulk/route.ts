import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import {
  permanentlyDeleteProduct,
  publishProduct,
  unpublishProduct,
} from "@/services/product.service";

const bulkProductActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "delete"]),
  productIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { action, productIds } = bulkProductActionSchema.parse(
      await req.json(),
    );
    const ids = Array.from(new Set(productIds));
    const results: {
      productId: number;
      success: boolean;
      error?: string;
    }[] = [];

    for (const productId of ids) {
      try {
        if (action === "publish") await publishProduct(productId);
        else if (action === "unpublish") await unpublishProduct(productId);
        else await permanentlyDeleteProduct(productId);
        results.push({ productId, success: true });
      } catch (error) {
        results.push({
          productId,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "The Product could not be updated.",
        });
      }
    }

    return NextResponse.json({
      results,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
