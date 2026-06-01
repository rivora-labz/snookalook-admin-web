export type RuntimeAuthMode = "supabase" | "backend" | "dev";

export const ADMIN_ACCESS_TOKEN_COOKIE = "snl_admin_access_token";

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getRuntimeAuthMode(): RuntimeAuthMode {
  const configured = process.env.NEXT_PUBLIC_AUTH_MODE;

  if (configured === "dev") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[runtime-auth] NEXT_PUBLIC_AUTH_MODE=dev rejected in production; falling back to supabase/backend",
      );
      return hasSupabaseConfig() ? "supabase" : "backend";
    }
    return "dev";
  }
  if (configured === "backend") return "backend";
  if (configured === "supabase") return hasSupabaseConfig() ? "supabase" : "backend";

  return hasSupabaseConfig() ? "supabase" : "backend";
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public auth config is missing for admin-web.");
  }

  return { url, anonKey };
}

// WEB.6.A — client-side cookie write/read/clear REMOVED. Cookie is HttpOnly,
// never reachable from JS. See src/app/actions/admin-token.ts for the only
// boundary crossings: `loginWithOtp` (verify + set in one action, no
// token-as-param) and `clearAdminAccessTokenCookie` (logout). Server-side
// readers (middleware, /api/proxy, audit/export route) reach the cookie via
// next/headers directly. No server action returns the JWT to JS.
