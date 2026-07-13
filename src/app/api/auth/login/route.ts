import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { loginUser } from "@/services/auth.service";
import { setAuthCookie } from "@/lib/auth-cookie";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);

    const { user, token } = await loginUser(input);
    setAuthCookie(token);

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}
