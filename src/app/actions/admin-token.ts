"use server";

import { cookies } from "next/headers";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "../../lib/runtime-auth";

// WEB.6 — HttpOnly enforcement on admin session JWT cookie. Client-set
// `document.cookie` could not carry HttpOnly (CSPM/OWASP A05:2021 violation),
// so write/clear/read move to server actions that set cookies via next/headers.
// Pair with middleware.ts which already reads the cookie server-side for staff gate.

const MAX_AGE_SECONDS = 3600;

export async function setAdminAccessTokenCookie(token: string): Promise<void> {
  (await cookies()).set(ADMIN_ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminAccessTokenCookie(): Promise<void> {
  (await cookies()).set(ADMIN_ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getAdminAccessToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? null;
}
