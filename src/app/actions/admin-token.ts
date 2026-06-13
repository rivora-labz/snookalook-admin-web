"use server";

import { cookies } from "next/headers";
import { API_BASE } from "../../lib/api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "../../lib/runtime-auth";

// H6.a — Vercel server-egress bypass route. Cloudflare DDoS-L7 (firewall_managed,
// pre-firewall_custom phase) flags the Vercel ASN on /v1/auth/* with 1020 "Access
// denied", and the WAF Skip rule we shipped at firewall_custom can't reach that
// earlier phase. `vapi.bypass.snookalook.com` is a gray-cloud A record straight
// to the VPS (Caddy + LE cert), used ONLY for server-action calls into auth
// endpoints. Browser-origin calls keep using API_BASE (api.snookalook.com).
const AUTH_BASE = "https://vapi.bypass.snookalook.com/v1";
void API_BASE;

// WEB.6.A — HttpOnly enforcement on admin session JWT cookie.
//
// P0 invariant: the JWT must never cross the JS trust boundary. No exported
// server action returns the token. The cookie is set as a side-effect of
// `loginWithOtp` (which validates against the backend server-side) and
// cleared by `clearAdminAccessTokenCookie`. Server-side readers reach the
// cookie via next/headers directly (middleware, /api/proxy, audit/export).
//
// P1 invariant: no server action accepts an attacker-supplied token. The
// previous `setAdminAccessTokenCookie(token)` allowed session fixation via
// the same-origin server-action endpoint (XSS-assisted or misconfigured
// allowedOrigins). `loginWithOtp` collapses verify+set into a single
// trust-boundary crossing so the token is only ever written from a value
// the backend just returned.

const MAX_AGE_SECONDS = 3600;

interface CookieFlagsInput {
  maxAge: number;
}

function adminCookieFlags({ maxAge }: CookieFlagsInput) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
  };
}

export type LoginWithOtpResult =
  | { ok: true }
  | { ok: false; message: string };

export type SendOtpResult =
  | { ok: true }
  | { ok: false; message: string };

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  if (typeof phone !== "string" || !/^\+\d{8,15}$/.test(phone)) {
    return { ok: false, message: "Invalid phone." };
  }
  let res: Response;
  let rawBodyText = "";
  try {
    res = await fetch(`${AUTH_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[H6.a-diag] sendOtp fetch threw", {
      api: `${AUTH_BASE}/auth/send-otp`,
      err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    return { ok: false, message: "Network error. Try again." };
  }
  try { rawBodyText = await res.text(); } catch {}
  let body: { message?: unknown } | null = null;
  try {
    body = rawBodyText ? (JSON.parse(rawBodyText) as { message?: unknown }) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    console.error("[H6.a-diag] sendOtp upstream non-OK", {
      api: `${AUTH_BASE}/auth/send-otp`,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      cfRay: res.headers.get("cf-ray") || "",
      server: res.headers.get("server") || "",
      via: res.headers.get("via") || "",
      bodyPreview: rawBodyText.slice(0, 240),
    });
    const upstreamMessage = typeof body?.message === "string" ? body.message : null;
    const message =
      upstreamMessage ??
      `Failed to send code (${res.status}${
        res.headers.get("cf-ray") ? `, cf=${res.headers.get("cf-ray")?.slice(0, 10)}` : ""
      }).`;
    return { ok: false, message };
  }
  return { ok: true };
}

export async function loginWithOtp(
  phone: string,
  otp: string,
): Promise<LoginWithOtpResult> {
  if (typeof phone !== "string" || !/^\+\d{8,15}$/.test(phone)) {
    return { ok: false, message: "Invalid phone." };
  }
  if (typeof otp !== "string" || !/^\d{4,6}$/.test(otp)) {
    return { ok: false, message: "Invalid code." };
  }

  let res: Response;
  let rawBodyText = "";
  try {
    res = await fetch(`${AUTH_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[H6.a-diag] loginWithOtp fetch threw", {
      api: `${AUTH_BASE}/auth/verify-otp`,
      err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    return { ok: false, message: "Network error. Try again." };
  }

  try {
    rawBodyText = await res.text();
  } catch (err) {
    console.error("[H6.a-diag] loginWithOtp text() threw", {
      status: res.status,
      err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }

  let body: { accessToken?: unknown; message?: unknown } | null = null;
  try {
    body = rawBodyText ? (JSON.parse(rawBodyText) as { accessToken?: unknown; message?: unknown }) : null;
  } catch {
    body = null;
  }

  if (!res.ok || typeof body?.accessToken !== "string" || body.accessToken.length === 0) {
    console.error("[H6.a-diag] loginWithOtp upstream non-OK", {
      api: `${AUTH_BASE}/auth/verify-otp`,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      cfRay: res.headers.get("cf-ray") || "",
      server: res.headers.get("server") || "",
      via: res.headers.get("via") || "",
      bodyPreview: rawBodyText.slice(0, 240),
    });
    const upstreamMessage =
      typeof body?.message === "string" ? body.message : null;
    const message =
      upstreamMessage ??
      `Backend rejected (${res.status}${
        res.headers.get("cf-ray") ? `, cf=${res.headers.get("cf-ray")?.slice(0, 10)}` : ""
      }).`;
    return { ok: false, message };
  }

  (await cookies()).set(
    ADMIN_ACCESS_TOKEN_COOKIE,
    body.accessToken,
    adminCookieFlags({ maxAge: MAX_AGE_SECONDS }),
  );
  return { ok: true };
}

export async function clearAdminAccessTokenCookie(): Promise<void> {
  (await cookies()).set(
    ADMIN_ACCESS_TOKEN_COOKIE,
    "",
    adminCookieFlags({ maxAge: 0 }),
  );
}
