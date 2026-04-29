import { createClient } from "./supabase/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.snookalook.app/v1";

export interface StaffContext {
  staffMemberId: string;
  centerId: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  user: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string;
  };
}

export interface ServerSession {
  userId: string;
  accessToken: string;
  email: string | null;
  phone: string | null;
  staff: StaffContext | null;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const staff = await getStaffContext(session.access_token);

  return {
    userId: session.user.id,
    accessToken: session.access_token,
    email: session.user.email ?? null,
    phone: session.user.phone ?? null,
    staff,
  };
}

/**
 * Resolves the operator's staff role + center scope by calling the backend.
 * Returns null on 403 (NOT_STAFF), 401, or network error. Middleware is the
 * primary gate; server components may call this for role-aware UI.
 */
export async function getStaffContext(accessToken: string): Promise<StaffContext | null> {
  try {
    const res = await fetch(`${API_BASE}/staff/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    const sm = body.staffMember;
    if (!sm) return null;
    return {
      staffMemberId: sm.id,
      centerId: sm.centerId,
      role: sm.role,
      user: sm.user,
    };
  } catch {
    return null;
  }
}
