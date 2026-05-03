const PRODUCTION_API_BASE = "https://api.snookalook.com/v1";

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

export const API_BASE = getApiBase();
