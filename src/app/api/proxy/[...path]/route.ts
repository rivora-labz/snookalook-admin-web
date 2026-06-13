import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SERVER_API_BASE } from "../../../../lib/api-base";
import { ADMIN_ACCESS_TOKEN_COOKIE, getRuntimeAuthMode } from "../../../../lib/runtime-auth";

// WEB.6.A P0 fix — server-side proxy for backend-auth mode.
// HttpOnly cookie is read here (never returned to client JS) and forwarded
// as a Bearer header to the upstream backend. Closes XSS-token-exfil that
// would otherwise re-open via a "use server" getter returning the JWT.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PASS_REQUEST_HEADERS = ["content-type", "accept"];
const PASS_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "cache-control",
];

async function buildAuthHeader(): Promise<Record<string, string>> {
  if (getRuntimeAuthMode() !== "backend") return {};
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function pickHeaders(
  src: Headers,
  allowed: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of allowed) {
    const v = src.get(name);
    if (v) out[name] = v;
  }
  return out;
}

async function forward(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const suffix = (path ?? []).map(encodeURIComponent).join("/");
  const search = req.nextUrl.search;
  const target = `${SERVER_API_BASE}/${suffix}${search}`;

  const auth = await buildAuthHeader();
  const fwdHeaders: Record<string, string> = {
    ...pickHeaders(req.headers, PASS_REQUEST_HEADERS),
    ...auth,
  };

  const method = req.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: fwdHeaders,
    cache: "no-store",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const buf = await upstream.arrayBuffer();
  const resHeaders = pickHeaders(upstream.headers, PASS_RESPONSE_HEADERS);
  if (!resHeaders["cache-control"]) {
    resHeaders["cache-control"] = "no-store, private";
  }
  return new NextResponse(buf, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
