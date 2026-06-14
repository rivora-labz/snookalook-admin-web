const PRODUCTION_API_BASE = "https://api.snookalook.com/v1";

// Doctrine 8.36 (candidate) — Vercel-Edge → CF-orange-cloud BFM block class.
// CF Bot Fight Mode flags Vercel ASN egress on api.snookalook.com (orange-cloud)
// at the firewall_managed phase, BEFORE firewall_custom Skip rules can apply.
// Any server-side fetch (Edge middleware, Node route handlers, server actions)
// MUST route via the gray-cloud bypass domain to reach the VPS directly.
// Browser-origin calls keep api.snookalook.com because the browser is not on
// the blocked ASN.
const PRODUCTION_SERVER_API_BASE = "https://vapi.bypass.snookalook.com/v1";

function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) return PRODUCTION_API_BASE;
  if (process.env.NODE_ENV !== "production") return configured;

  try {
    const url = new URL(configured);
    if (url.origin !== "https://api.snookalook.com") return PRODUCTION_API_BASE;
    if (url.pathname === "/v1" || url.pathname === "/v1/") return PRODUCTION_API_BASE;
  } catch {
    return PRODUCTION_API_BASE;
  }

  return PRODUCTION_API_BASE;
}

function getServerApiBase(): string {
  const configured = process.env.SERVER_API_URL?.trim();
  if (process.env.NODE_ENV !== "production") {
    return configured || process.env.NEXT_PUBLIC_API_URL?.trim() || PRODUCTION_SERVER_API_BASE;
  }
  if (!configured) return PRODUCTION_SERVER_API_BASE;
  try {
    const url = new URL(configured);
    if (url.origin !== "https://vapi.bypass.snookalook.com") return PRODUCTION_SERVER_API_BASE;
    if (url.pathname === "/v1" || url.pathname === "/v1/") return PRODUCTION_SERVER_API_BASE;
  } catch {
    return PRODUCTION_SERVER_API_BASE;
  }
  return PRODUCTION_SERVER_API_BASE;
}

export const API_BASE = getApiBase();
export const SERVER_API_BASE = getServerApiBase();
