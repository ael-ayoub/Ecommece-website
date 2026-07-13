import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "auth_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches jwt.ts's expiresIn

export function setAuthCookie(token: string) {
  cookies().set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie() {
  cookies().set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getAuthCookie(): string | undefined {
  return cookies().get(AUTH_COOKIE_NAME)?.value;
}
