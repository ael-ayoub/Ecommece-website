import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { loginUser } from "@/services/auth.service";
import { setAuthCookie } from "@/lib/auth-cookie";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await req.json();
    const input = loginSchema.parse(body);
    enforceRateLimit(
      `login:${requestIp(req)}:${input.email}`,
      Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 10),
      15 * 60_000,
    );

    const { user, token } = await loginUser(input);
    setAuthCookie(token);

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}
