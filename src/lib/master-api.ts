/**
 * Server-side helpers for master (founder) panel API calls.
 * Uses the operator's Bearer token (from cookie or supabase session)
 * and the backend `/v1/admin/system/*` endpoints.
 */
import { cookies } from "next/headers";
import { API_BASE } from "./api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode } from "./runtime-auth";
import { createClient } from "./supabase/server";

async function resolveAuthHeader(): Promise<Record<string, string>> {
  const mode = getRuntimeAuthMode();
  if (mode === "supabase") {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }
  if (mode === "backend") {
    const token = cookies().get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const devUser = process.env.NEXT_PUBLIC_DEV_USER_ID;
  return devUser ? { "X-Dev-User": devUser } : {};
}

export async function masterFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await resolveAuthHeader()),
  };
  const url = `${API_BASE}/admin/system${path}`;
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`master fetch ${path} → ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

export async function masterFetchSafe<T>(
  path: string,
  fallback: T,
): Promise<T> {
  try {
    return await masterFetch<T>(path);
  } catch (err) {
    console.error("[master-api]", path, err);
    return fallback;
  }
}
