import { createClient } from "./supabase/server";
import { API_BASE } from "./api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode } from "./runtime-auth";
import { cookies } from "next/headers";

const AUTH_MODE = getRuntimeAuthMode();
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

export type StaffRole = "OWNER" | "MANAGER" | "STAFF" | "FOUNDER";

export interface StaffContext {
  staffMemberId: string;
  centerId: string | null;
  centerName?: string;
  role: StaffRole;
  user: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string;
  };
}

export function isFounder(ctx: StaffContext | null | undefined): boolean {
  return ctx?.role === "FOUNDER";
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
    if (AUTH_MODE === "backend") {
      const accessToken = cookies().get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
      if (!accessToken) return null;

      const staff = await getStaffContext(accessToken, false);
      if (!staff) return null;

      return {
        userId: staff.user.id,
        accessToken,
        email: staff.user.email,
        phone: staff.user.phone,
        staff,
      };
    }

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
      centerId: sm.centerId ?? null,
      centerName: sm.centerName,
      role: sm.role,
      user: sm.user,
    };
  } catch {
    return null;
  }
}
