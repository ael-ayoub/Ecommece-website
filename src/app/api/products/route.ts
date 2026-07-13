import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct } from "@/services/product.service";
import { productCreateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // ?all=1 additionally requires an admin session — the admin product list
    // needs to see soft-deleted (isActive: false) products; public browsing never does.
    const wantsAll = searchParams.get("all") === "1";
    const user = wantsAll ? await getCurrentUser() : null;

    const result = await listProducts({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
      categorySlug: searchParams.get("category") ?? undefined,
      search: searchParams.get("q") ?? undefined,
      includeInactive: wantsAll && user?.role === "ADMIN",
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = productCreateSchema.parse(body);
    const product = await createProduct(input);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
