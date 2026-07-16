import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/services/auth.service";
import { setAuthCookie } from "@/lib/auth-cookie";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    enforceRateLimit(
      `register:${requestIp(req)}`,
      Number(process.env.RATE_LIMIT_REGISTER_MAX ?? 5),
      60 * 60_000,
    );
    const body = await req.json();
    const input = registerSchema.parse(body);

    const { user, token } = await registerUser(input);
    setAuthCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
