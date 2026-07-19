import { NextRequest, NextResponse } from "next/server";
import { orderCreateSchema } from "@/lib/validators";
import { createOrder, listOrdersForUser } from "@/services/order.service";
import { requireUser } from "@/lib/guards/require-user";
import { getCurrentUser } from "@/lib/get-current-user";
import { handleApiError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/security/origin";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";
import { paginationMeta, parsePagination } from "@/lib/pagination";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { UnauthorizedError } from "@/lib/errors";

// Guest checkout is allowed (architecture.md §6), so this endpoint is
// intentionally NOT behind requireUser() — it just attaches userId when a
// session cookie happens to be present.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const currentUser = await getCurrentUser();
    if (req.cookies.has(AUTH_COOKIE_NAME) && !currentUser) {
      throw new UnauthorizedError(
        "Your account is disabled or your session is no longer valid.",
      );
    }
    enforceRateLimit(
      `checkout:${requestIp(req)}:${currentUser?.id ?? "guest"}`,
      Number(process.env.RATE_LIMIT_CHECKOUT_MAX ?? 10),
      15 * 60_000,
    );
    const body = await req.json();
    const input = orderCreateSchema.parse(body);
    const idempotencyKey = req.headers.get("idempotency-key");
    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return NextResponse.json(
        { error: "A valid Idempotency-Key UUID is required." },
        { status: 400 },
      );
    }

    const result = await createOrder(
      input,
      currentUser?.id ?? null,
      idempotencyKey,
    );
    return NextResponse.json(
      { order: result.order, idempotentReplay: result.replayed },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

// Own order history — logged-in only (architecture.md §6: guests have no tracking).
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = parsePagination(
      url.searchParams.get("page"),
      url.searchParams.get("pageSize"),
    );
    const result = await listOrdersForUser(user.id, page, pageSize);
    return NextResponse.json({
      data: result.data,
      orders: result.data,
      pagination: paginationMeta(page, pageSize, result.totalItems),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
