/**
 * Server-side helpers for master (founder) panel API calls.
 * Uses the operator's Bearer token (from cookie or supabase session)
 * and the backend `/v1/admin/system/*` endpoints.
 */
import { cookies } from "next/headers";
import { API_BASE } from "./api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode } from "./runtime-auth";
import { createClient } from "./supabase/server";

async function resolveAuthHeader(): Promise<{ headers: Record<string, string>; diag: string }> {
  const mode = getRuntimeAuthMode();
  if (mode === "supabase") {
    const supabase = await createClient();
    // getUser() forces validation/refresh; getSession() alone returns stale cookie state.
    await supabase.auth.getUser().catch(() => null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        headers: { Authorization: `Bearer ${session.access_token}` },
        diag: `mode=supabase tokenLen=${session.access_token.length}`,
      };
    }
    return { headers: {}, diag: "mode=supabase NO_SESSION" };
  }
  if (mode === "backend") {
    const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      diag: token ? `mode=backend tokenLen=${token.length}` : "mode=backend NO_COOKIE",
    };
  }
  const devUser = process.env.NEXT_PUBLIC_DEV_USER_ID;
  return {
    headers: devUser ? { "X-Dev-User": devUser } : {},
    diag: devUser ? `mode=dev user=${devUser}` : "mode=dev NO_USER",
  };
}

export async function masterFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { headers: authHeaders, diag } = await resolveAuthHeader();
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...authHeaders,
  };
  const url = `${API_BASE}/admin/system${path}`;
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`master fetch ${path} → ${res.status} ${body} [${diag}]`);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[master-api]", path, msg);
    return fallback;
  }
}

export type MasterResult<T> = { data: T; error: null } | { data: T; error: string };

export async function masterFetchOrError<T>(
  path: string,
  fallback: T,
): Promise<MasterResult<T>> {
  try {
    const data = await masterFetch<T>(path);
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[master-api]", path, msg);
    return { data: fallback, error: msg };
  }
}
