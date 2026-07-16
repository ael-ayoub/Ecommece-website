import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { optionTemplatePreferenceSchema } from "@/lib/validators";
import { setOptionTemplatePinned } from "@/services/option-template.service";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { isPinned } = optionTemplatePreferenceSchema.parse(await req.json());
    const preference = await setOptionTemplatePinned(admin.id, Number(params.id), isPinned);
    return NextResponse.json({ preference });
  } catch (error) {
    return handleApiError(error);
  }
}
