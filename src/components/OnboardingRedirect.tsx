"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { apiFetch } from "../lib/api";

const DISMISS_KEY = "onboardingDismissed";
// Routes excluded from auto-redirect — already on onboarding, or explicit destinations.
const EXCLUDED_PREFIXES = ["/onboarding-hub", "/login", "/forbidden"];

export default function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      // ignore
    }
    if (dismissed) return;

    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();
        const to = new Date(now.getTime() + 30 * 24 * 3600_000).toISOString();
        const [tablesRes, bookingsRes] = await Promise.all([
          apiFetch<{ items: unknown[] }>("/admin/tables"),
          apiFetch<{ items: unknown[]; total?: number }>(
            `/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1`,
          ),
        ]);
        const tablesEmpty = tablesRes.items.length === 0;
        const bookingsEmpty = (bookingsRes.total ?? bookingsRes.items.length) === 0;
        if (!cancelled && tablesEmpty && bookingsEmpty) {
          router.replace("/onboarding-hub" as Route);
        }
      } catch {
        // Silent — don't redirect on auth/network failures.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
