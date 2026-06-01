import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "../../../../../lib/api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode } from "../../../../../lib/runtime-auth";
import { createClient } from "../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveAuthHeader(): Promise<Record<string, string>> {
  const mode = getRuntimeAuthMode();
  if (mode === "supabase") {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
    return {};
  }
  if (mode === "backend") {
    const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const devUser = process.env.NEXT_PUBLIC_DEV_USER_ID;
  return devUser ? { "X-Dev-User": devUser } : {};
}

export async function GET(req: NextRequest) {
  const headers = await resolveAuthHeader();
  const search = req.nextUrl.search;
  const url = `${API_BASE}/admin/system/audit/export${search}`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "audit_export_failed", status: res.status },
      { status: res.status, headers: { "Cache-Control": "no-store, private" } },
    );
  }
  const body = await res.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition":
        res.headers.get("content-disposition") ??
        `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      // Burst-10 AL.2 — user-specific CSV export. `private` blocks shared CDN cache
      // (prevents cross-user data leak via edge cache); `no-store` blocks all cache layers.
      "Cache-Control": "no-store, private",
    },
  });
}
