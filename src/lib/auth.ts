import { createClient } from "./supabase/server";
import { API_BASE } from "./api-base";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "dev";
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

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

const DEV_STAFF: StaffContext = {
  staffMemberId: "dev-staff",
  centerId: "dev-center",
  role: "OWNER",
  user: { id: "dev-user", displayName: "Dev User", email: "dev@snookalook.app", phone: "+971000000000" },
};

export async function getServerSession(): Promise<ServerSession | null> {
  if (AUTH_MODE !== "supabase") {
    if (!DEV_USER_ID) {
      return { userId: "dev-user", accessToken: "", email: null, phone: null, staff: DEV_STAFF };
    }
    const staff = await getStaffContext(DEV_USER_ID, true);
    return {
      userId: DEV_USER_ID,
      accessToken: "",
      email: null,
      phone: null,
      staff: staff ?? DEV_STAFF,
    };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const staff = await getStaffContext(session.access_token, false);

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
export async function getStaffContext(token: string, isDevUser = false): Promise<StaffContext | null> {
  try {
    const headers: Record<string, string> = isDevUser
      ? { "X-Dev-User": token }
      : { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_BASE}/staff/me`, { headers, cache: "no-store" });
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
