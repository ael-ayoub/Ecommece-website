import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { productCreateSchema } from "@/lib/validators";
import { createProduct } from "@/services/product.service";

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        row: z.number().int().min(2),
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().min(1).max(5_000),
        basePrice: z.number(),
        category: z.string().trim().min(1).max(100),
        sku: z.string().trim().min(1).max(64),
        stock: z.number(),
        isActive: z.boolean(),
      }),
    )
    .min(1)
    .max(25),
});

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { rows } = importSchema.parse(await req.json());
    const categories = await db.category.findMany({
      where: {
        OR: rows.flatMap((row) => [
          { name: { equals: row.category, mode: "insensitive" as const } },
          { slug: { equals: row.category, mode: "insensitive" as const } },
        ]),
      },
    });
    const results: { row: number; success: boolean; error?: string }[] = [];
    for (const row of rows) {
      const category = categories.find(
        (item) =>
          item.name.toLowerCase() === row.category.toLowerCase() ||
          item.slug.toLowerCase() === row.category.toLowerCase(),
      );
      if (!category) {
        results.push({
          row: row.row,
          success: false,
          error: "Unknown Category.",
        });
        continue;
      }
      try {
        const input = productCreateSchema.parse({
          productType: "SIMPLE",
          name: row.name,
          description: row.description,
          basePrice: row.basePrice,
          categoryId: category.id,
          isActive: row.isActive,
          showExactStock: false,
          images: [],
          sku: { code: row.sku, stockQuantity: row.stock, isActive: true },
        });
        await createProduct(input, admin.id);
        results.push({ row: row.row, success: true });
      } catch (error) {
        results.push({
          row: row.row,
          success: false,
          error: error instanceof Error ? error.message : "Import failed.",
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
