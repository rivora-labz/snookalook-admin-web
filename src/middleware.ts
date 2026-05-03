import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { API_BASE } from "./lib/api-base";

const PUBLIC_PATHS = ["/login", "/forbidden", "/auth/callback"];

type StaffCheck = "OK" | "NOT_STAFF" | "UNAUTH" | "ERROR";

async function checkStaff(headers: Record<string, string>): Promise<StaffCheck> {
  try {
    const res = await fetch(`${API_BASE}/staff/me`, {
      headers,
      cache: "no-store",
    });
    if (res.status === 200) return "OK";
    if (res.status === 401) return "UNAUTH";
    if (res.status === 403) return "NOT_STAFF";
    return "ERROR";
  } catch {
    return "ERROR";
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
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (authMode !== "supabase") {
    if (isPublic) return NextResponse.next();
    const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
    if (!devUserId) return NextResponse.next();
    const verdict = await checkStaff({ "X-Dev-User": devUserId });
    if (verdict === "NOT_STAFF") return redirectTo(req, "/forbidden");
    // In dev mode, UNAUTH/ERROR means backend unreachable or misconfigured — pass through.
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      if (verdict === "NOT_STAFF") return redirectTo(req, "/forbidden");
      if (verdict === "UNAUTH") return redirectTo(req, "/login", path);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
