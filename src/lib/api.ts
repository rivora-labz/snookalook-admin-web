import { createClient } from "./supabase/client";
import { API_BASE } from "./api-base";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "dev";

// Dev-only fallback: backend (NODE_ENV !== "production") accepts
// `X-Dev-User: <userId>` instead of a real Supabase JWT. Set
// NEXT_PUBLIC_DEV_USER_ID in .env.local to the seeded OWNER user uuid.
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (AUTH_MODE === "supabase") {
    if (typeof window === "undefined") return {};
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }

  if (DEV_USER_ID) {
    return { "X-Dev-User": DEV_USER_ID };
  }
  return { Authorization: "Bearer PLACEHOLDER" };
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

  if (res.status === 401 && AUTH_MODE === "supabase" && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "UNAUTHORIZED", "Session expired.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? res.statusText);
  }

  return res.json();
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeader },
  });
  if (res.status === 401 && AUTH_MODE === "supabase" && typeof window !== "undefined") {
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

  if (res.status === 401 && AUTH_MODE === "supabase" && typeof window !== "undefined") {
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

export function formatAED(fils: number): string {
  return `AED ${(fils / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
}
