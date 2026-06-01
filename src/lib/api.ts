import { createClient } from "./supabase/client";
import { API_BASE } from "./api-base";
import { getRuntimeAuthMode } from "./runtime-auth";

// Dev-only fallback: backend (NODE_ENV !== "production") accepts
// `X-Dev-User: <userId>` instead of a real Supabase JWT. Set
// NEXT_PUBLIC_DEV_USER_ID in .env.local to the seeded OWNER user uuid.
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

// WEB.6.A P0 — In backend mode the JWT lives in an HttpOnly cookie and must
// never cross the JS trust boundary. Requests are routed through the in-app
// proxy at /api/proxy/[...path], which reads the cookie server-side and
// attaches the Bearer header upstream. The browser sends the cookie to the
// same-origin proxy automatically; no JS code reads or holds the token.
const BACKEND_PROXY_PREFIX = "/api/proxy";

export class MisconfiguredAuth extends Error {
  constructor(message = "Auth misconfigured: dev mode requires NEXT_PUBLIC_DEV_USER_ID.") {
    super(message);
    this.name = "MisconfiguredAuth";
  }
}

interface ResolvedRequest {
  url: string;
  authHeader: Record<string, string>;
}

function joinProxy(path: string): string {
  return path.startsWith("/")
    ? `${BACKEND_PROXY_PREFIX}${path}`
    : `${BACKEND_PROXY_PREFIX}/${path}`;
}

async function resolveRequest(path: string): Promise<ResolvedRequest> {
  const authMode = getRuntimeAuthMode();

  if (authMode === "supabase") {
    let authHeader: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = { Authorization: `Bearer ${session.access_token}` };
      }
    }
    return { url: `${API_BASE}${path}`, authHeader };
  }

  if (authMode === "backend") {
    return { url: joinProxy(path), authHeader: {} };
  }

  if (DEV_USER_ID) {
    return {
      url: `${API_BASE}${path}`,
      authHeader: { "X-Dev-User": DEV_USER_ID },
    };
  }
  throw new MisconfiguredAuth();
}

function handleAuthFailure(status: number): void {
  if (status === 401 && getRuntimeAuthMode() !== "dev" && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "UNAUTHORIZED", "Session expired.");
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, authHeader } = await resolveRequest(path);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });

  handleAuthFailure(res.status);

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
  const { url, authHeader } = await resolveRequest(path);
  const res = await fetch(url, { headers: { ...authHeader } });
  handleAuthFailure(res.status);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? res.statusText);
  }
  return res.blob();
}

export async function apiFetchFormData<T>(path: string, body: FormData): Promise<T> {
  const { url, authHeader } = await resolveRequest(path);

  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeader },
    body,
  });

  handleAuthFailure(res.status);

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
