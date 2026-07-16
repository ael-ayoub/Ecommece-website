import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { optionTemplateUpdateSchema } from "@/lib/validators";
import {
  disablePersonalOptionTemplate,
  updatePersonalOptionTemplate,
} from "@/services/option-template.service";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const input = optionTemplateUpdateSchema.parse(await req.json());
    const template = await updatePersonalOptionTemplate(admin.id, Number(params.id), input);
    return NextResponse.json({ template });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    await disablePersonalOptionTemplate(admin.id, Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
