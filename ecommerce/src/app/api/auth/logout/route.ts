import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth-cookie";
import { assertSameOrigin } from "@/lib/security/origin";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
