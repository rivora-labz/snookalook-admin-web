import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { API_BASE } from "./lib/api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode, getSupabaseConfig } from "./lib/runtime-auth";

const PUBLIC_PATHS = ["/login", "/forbidden", "/auth/callback", "/welcome"];

type StaffStatus = "OK" | "NOT_STAFF" | "UNAUTH" | "ERROR";
type StaffRole = "OWNER" | "MANAGER" | "STAFF" | "FOUNDER";
type StaffCheck = { status: StaffStatus; role: StaffRole | null };

async function checkStaff(headers: Record<string, string>): Promise<StaffCheck> {
  try {
    const res = await fetch(`${API_BASE}/staff/me`, {
      headers,
      cache: "no-store",
    });
    if (res.status === 200) {
      const body = (await res.json().catch(() => null)) as
        | { staffMember?: { role?: StaffRole } }
        | null;
      return { status: "OK", role: body?.staffMember?.role ?? null };
    }
    if (res.status === 401) return { status: "UNAUTH", role: null };
    if (res.status === 403) return { status: "NOT_STAFF", role: null };
    return { status: "ERROR", role: null };
  } catch {
    return { status: "ERROR", role: null };
  }
}

function redirectTo(req: NextRequest, pathname: string, withNext?: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (withNext) url.searchParams.set("next", withNext);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const authMode = getRuntimeAuthMode();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const isMasterRoute = path === "/master" || path.startsWith("/master/");

  if (authMode === "dev") {
    if (isPublic) return NextResponse.next();
    const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
    if (!devUserId) return NextResponse.next();
    const verdict = await checkStaff({ "X-Dev-User": devUserId });
    if (verdict.status === "NOT_STAFF") return redirectTo(req, "/forbidden");
    if (isMasterRoute && verdict.role !== "FOUNDER") return redirectTo(req, "/dashboard");
    // In dev mode, UNAUTH/ERROR means backend unreachable or misconfigured — pass through.
    return NextResponse.next();
  }

  if (authMode === "backend") {
    const accessToken = req.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken && !isPublic) {
      return redirectTo(req, "/login", path);
    }

    if (!accessToken) return NextResponse.next();

    const verdict = await checkStaff({ Authorization: `Bearer ${accessToken}` });

    if (path === "/login" && verdict.status === "OK") {
      return redirectTo(req, verdict.role === "FOUNDER" ? "/master/overview" : "/");
    }

    if (isPublic) {
      if (verdict.status === "OK" && path === "/login") {
        return redirectTo(req, verdict.role === "FOUNDER" ? "/master/overview" : "/");
      }
      return NextResponse.next();
    }

    if (verdict.status === "NOT_STAFF") return redirectTo(req, "/forbidden");
    if (verdict.status === "UNAUTH" || verdict.status === "ERROR") {
      const res = redirectTo(req, "/login", path);
      res.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
      return res;
    }

    if (isMasterRoute && verdict.role !== "FOUNDER") {
      return redirectTo(req, "/dashboard");
    }

    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    return redirectTo(req, "/login", path);
  }

  if (user && path === "/login") {
    return redirectTo(req, "/");
  }

  if (user && !isPublic) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      const verdict = await checkStaff({ Authorization: `Bearer ${session.access_token}` });
      if (verdict.status === "NOT_STAFF") return redirectTo(req, "/forbidden");
      if (verdict.status === "UNAUTH") return redirectTo(req, "/login", path);
      if (isMasterRoute && verdict.role !== "FOUNDER") {
        return redirectTo(req, "/dashboard");
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
