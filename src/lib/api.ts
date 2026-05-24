import { createClient } from "./supabase/client";
import { API_BASE } from "./api-base";
import { getRuntimeAuthMode, readAdminAccessTokenCookie } from "./runtime-auth";

// Dev-only fallback: backend (NODE_ENV !== "production") accepts
// `X-Dev-User: <userId>` instead of a real Supabase JWT. Set
// NEXT_PUBLIC_DEV_USER_ID in .env.local to the seeded OWNER user uuid.
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

export class MisconfiguredAuth extends Error {
  constructor(message = "Auth misconfigured: dev mode requires NEXT_PUBLIC_DEV_USER_ID.") {
    super(message);
    this.name = "MisconfiguredAuth";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const authMode = getRuntimeAuthMode();

  if (authMode === "supabase") {
    if (typeof window === "undefined") return {};
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }

  if (authMode === "backend") {
    const accessToken = readAdminAccessTokenCookie();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }

  if (DEV_USER_ID) {
    return { "X-Dev-User": DEV_USER_ID };
  }
  throw new MisconfiguredAuth();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });

  if (res.status === 401 && getRuntimeAuthMode() !== "dev" && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "UNAUTHORIZED", "Session expired.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? res.statusText);
  }

  return res.json();
}

export interface RetryOpts {
  retries?: number;
  baseMs?: number;
}

export async function apiFetchRetry<T>(
  path: string,
  init?: RequestInit,
  retryOpts: RetryOpts = {},
): Promise<T> {
  const retries = retryOpts.retries ?? 3;
  const baseMs = retryOpts.baseMs ?? 1000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiFetch<T>(path, init);
    } catch (err) {
      lastErr = err;
      const isApiErr = err instanceof ApiError;
      const retryable = !isApiErr || (err.status >= 500 && err.status < 600);
      if (!retryable || attempt === retries) break;
      const delay = baseMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeader },
  });
  if (res.status === 401 && getRuntimeAuthMode() !== "dev" && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "UNAUTHORIZED", "Session expired.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? res.statusText);
  }
  return res.blob();
}

export async function apiFetchFormData<T>(path: string, body: FormData): Promise<T> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...authHeader },
    body,
  });

  if (res.status === 401 && getRuntimeAuthMode() !== "dev" && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "UNAUTHORIZED", "Session expired.");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody?.code ?? "UNKNOWN", errBody?.message ?? res.statusText);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export { formatAED } from "./currency";
export { formatDate, formatDateShort } from "./datetime";
