import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/services/auth.service";
import { setAuthCookie } from "@/lib/auth-cookie";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = registerSchema.parse(body);

    const { user, token } = await registerUser(input);
    setAuthCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
