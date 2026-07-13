import { NextRequest, NextResponse } from "next/server";
import { verifyJwtEdge } from "@/lib/jwt-edge";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export const config = {
  // /orders is logged-in only (architecture.md §6 — guests have no order
  // tracking); /checkout is intentionally NOT here, since guest checkout
  // must remain reachable without an account.
  matcher: ["/account/:path*", "/orders/:path*", "/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyJwtEdge(token) : null;

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}
