import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct } from "@/services/product.service";
import { productCreateSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/guards/require-admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { ProductType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // ?all=1 additionally requires an admin session — the admin product list
    // needs to see soft-deleted (isActive: false) products; public browsing never does.
    const wantsAll = searchParams.get("all") === "1";
    const user = wantsAll ? await getCurrentUser() : null;
    if (wantsAll && user?.role !== "ADMIN") {
      await requireAdmin();
    }
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const availability = searchParams.get("availability");
    const sort = searchParams.get("sort");
    const numberParam = (name: string) => {
      const raw = searchParams.get(name);
      if (raw === null || raw === "") return undefined;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : undefined;
    };

    const result = await listProducts({
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
      categorySlug: searchParams.get("category") ?? undefined,
      search: searchParams.get("q") ?? undefined,
      includeInactive: wantsAll && user?.role === "ADMIN",
      productType:
        type === "SIMPLE" || type === "CONFIGURABLE"
          ? (type as ProductType)
          : undefined,
      publicationStatus:
        status === "published" || status === "unpublished" ? status : undefined,
      availability:
        availability === "available" ||
        availability === "out_of_stock" ||
        availability === "unavailable"
          ? availability
          : undefined,
      minPrice: numberParam("minPrice"),
      maxPrice: numberParam("maxPrice"),
      sort:
        sort === "newest" ||
        sort === "oldest" ||
        sort === "name" ||
        sort === "price" ||
        sort === "status"
          ? sort
          : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const body = await req.json();
    const input = productCreateSchema.parse(body);
    const product = await createProduct(input, admin.id);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
