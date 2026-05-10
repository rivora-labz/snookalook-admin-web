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

  if (configured === "dev") return "dev";
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

export function readAdminAccessTokenCookie() {
  if (typeof document === "undefined") return null;

  const prefix = `${ADMIN_ACCESS_TOKEN_COOKIE}=`;
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function writeAdminAccessTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${ADMIN_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
}

export function clearAdminAccessTokenCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${ADMIN_ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
