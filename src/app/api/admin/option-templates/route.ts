import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { optionTemplateCreateSchema } from "@/lib/validators";
import {
  createPersonalOptionTemplate,
  listOptionTemplates,
} from "@/services/option-template.service";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const url = new URL(req.url);
    const templates = await listOptionTemplates(admin.id, {
      categoryId: url.searchParams.get("categoryId")
        ? Number(url.searchParams.get("categoryId"))
        : undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const input = optionTemplateCreateSchema.parse(await req.json());
    const template = await createPersonalOptionTemplate(admin.id, input);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
