"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Route } from "next";
import { apiFetch, formatAED, ApiError } from "../../../lib/api";
import OnboardingChecklist, { type ChecklistStep } from "../../../components/OnboardingChecklist";
import QuickLinkCard from "../../../components/QuickLinkCard";
import { STATUS_TOKEN } from "../../../lib/status-tokens";

const DISMISS_KEY = "snook.onboarding.dismissed";
const SKIPPED_KEY_PREFIX = "snook.onboarding.skipped.";
const STEP_IDS = ["tables", "pricing", "team", "bookings", "hours", "photos"] as const;

interface TableItem {
  id: string;
  pricePerHourFils?: number | null;
  hourlyRate?: number | null;
}
interface TeamMember {
  id: string;
  role: string;
}
interface KpiResponse {
  totalBookings?: number;
  totalRevenue?: number;
  activePlayers?: number;
  tableUtilization?: number;
}
interface SettingsResponse {
  profile: { name: string };
  hours: Record<string, unknown> | null;
  pricing: Record<string, unknown> | null;
}
interface CenterMeResponse {
  onboardingDismissedAt?: string | null;
  skippedSteps?: string[];
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
      <p style={{ color: STATUS_TOKEN.FAILURE }}>{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
      >
        Retry
      </button>
    </div>
  );
}

export default function OnboardingHubPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissBackendGap, setDismissBackendGap] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [skippedSet, setSkippedSet] = useState<Set<string>>(new Set());
  const [skipBackendGap, setSkipBackendGap] = useState(false);
  const [autoDismissPending, setAutoDismissPending] = useState(false);
  const autoDismissTriggeredRef = useRef(false);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async (signal: AbortSignal) => {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();
      const to = new Date(now.getTime() + 30 * 24 * 3600_000).toISOString();

      const results = await Promise.allSettled([
        apiFetch<{ items: TableItem[] }>("/admin/tables", { signal }),
        apiFetch<{ items: TeamMember[] }>("/admin/team", { signal }),
        apiFetch<{ items: unknown[]; total?: number }>(
          `/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1`,
          { signal },
        ),
        apiFetch<KpiResponse>("/admin/dashboard/kpis", { signal }),
        apiFetch<SettingsResponse>("/admin/settings", { signal }),
        apiFetch<CenterMeResponse>("/admin/centers/me", { signal }),
        apiFetch<{ items: { id: string }[] }>("/admin/centers/me/photos", { signal }),
      ]);

      if (signal.aborted) return;

      if (results[0].status === "fulfilled") setTables(results[0].value.items);
      if (results[1].status === "fulfilled") setTeam(results[1].value.items);
      if (results[2].status === "fulfilled") {
        const r = results[2].value;
        setBookingsCount(r.total ?? r.items.length);
      }
      if (results[3].status === "fulfilled") setKpis(results[3].value);
      if (results[4].status === "fulfilled") setSettings(results[4].value);
      if (results[6].status === "fulfilled") setPhotosCount(results[6].value.items.length);
      let serverDismissed = false;
      let centerResp: CenterMeResponse | null = null;
      if (results[5].status === "fulfilled") {
        centerResp = results[5].value;
        if (centerResp.onboardingDismissedAt) serverDismissed = true;
      }
      let localDismissed = false;
      try {
        localDismissed = !!localStorage.getItem(DISMISS_KEY);
      } catch {
        // ignore
      }
      setDismissed(serverDismissed || localDismissed);

      const merged = new Set<string>();
      const serverHasSkippedKey = !!centerResp && "skippedSteps" in centerResp;
      if (serverHasSkippedKey && Array.isArray(centerResp?.skippedSteps)) {
        for (const id of centerResp.skippedSteps) merged.add(id);
      }
      for (const id of STEP_IDS) {
        try {
          if (localStorage.getItem(SKIPPED_KEY_PREFIX + id) === "true") merged.add(id);
        } catch {
          // ignore
        }
      }
      setSkippedSet(merged);
      if (serverHasSkippedKey) setSkipBackendGap(false);

      const failed = results.slice(0, 5).filter((r) => r.status === "rejected");
      setError(failed.length === 5 ? "Failed to load setup data" : null);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof ApiError && err.code === "ABORTED") return;
      setError(err instanceof Error ? err.message : "Failed to load setup data");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const kickFetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    fetchAll(controller.signal);
  }, [fetchAll]);

  useEffect(() => {
    kickFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [kickFetch]);

  const handleSkip = async () => {
    const ts = new Date().toISOString();
    try {
      localStorage.setItem(DISMISS_KEY, ts);
    } catch {
      // ignore
    }
    try {
      await apiFetch("/admin/centers/me", {
        method: "PATCH",
        body: JSON.stringify({ onboardingDismissedAt: ts }),
      });
      setDismissed(true);
      return;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setDismissBackendGap(true);
      }
    }
    setDismissed(true);
  };

  const handleResume = async () => {
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // ignore
    }
    setDismissed(false);
    setDismissBackendGap(false);
    try {
      await apiFetch("/admin/centers/me", {
        method: "PATCH",
        body: JSON.stringify({ onboardingDismissedAt: null }),
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        return;
      }
    }
  };

  const handleSkipStep = useCallback(async (stepId: string) => {
    try {
      localStorage.setItem(SKIPPED_KEY_PREFIX + stepId, "true");
    } catch {
      // ignore
    }
    setSkippedSet((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
    try {
      await apiFetch("/admin/centers/me/skipped-steps", {
        method: "PATCH",
        body: JSON.stringify({ stepId, skipped: true }),
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setSkipBackendGap(true);
      }
    }
  }, []);

  const hasTables = tables.length > 0;
  const hasPhotos = photosCount > 0;
  const hasPricing = (() => {
    const fromTable = tables.some((t) => (t.pricePerHourFils ?? t.hourlyRate ?? 0) > 0);
    if (fromTable) return true;
    const sp = settings?.pricing;
    if (!sp) return false;
    return Object.keys(sp).length > 0;
  })();
  const hasTeam = team.length > 1;
  const hasBookings = bookingsCount > 0;
  const hasHours = (() => {
    const h = settings?.hours;
    if (!h) return false;
    return Object.keys(h).length > 0;
  })();

  const steps: ChecklistStep[] = [
    {
      id: "tables",
      title: "Add your first table",
      description: "Register the snooker / pool tables in your hall.",
      href: "/" as Route,
      done: hasTables,
      skipped: skippedSet.has("tables"),
      todo: hasTables ? null : "Click '+ Add Table' on the Floor page to register your first table.",
    },
    {
      id: "pricing",
      title: "Set table pricing",
      description: "Configure the per-hour rate for each table type (AED).",
      href: "/settings" as Route,
      done: hasPricing,
      skipped: skippedSet.has("pricing"),
    },
    {
      id: "team",
      title: "Invite your team",
      description: "Add managers and front-desk staff so they can check guests in.",
      href: "/team" as Route,
      done: hasTeam,
      skipped: skippedSet.has("team"),
    },
    {
      id: "bookings",
      title: "Test a booking",
      description: "Create a walk-in booking to verify the flow end-to-end.",
      href: "/bookings" as Route,
      done: hasBookings,
      skipped: skippedSet.has("bookings"),
      todo: hasBookings ? null : "Create a test booking via Bookings → New to confirm the flow.",
    },
    {
      id: "hours",
      title: "Configure operating hours",
      description: "Set per-day open / close times so the booking grid matches reality.",
      href: "/settings" as Route,
      done: hasHours,
      skipped: skippedSet.has("hours"),
    },
    {
      id: "photos",
      title: "Upload center photos",
      description: "Add photos of your club — players love seeing the space before they book.",
      href: "/settings/photos" as Route,
      done: hasPhotos,
      skipped: skippedSet.has("photos"),
    },
  ];

  const completed = steps.filter((s) => s.done || s.skipped).length;
  const allComplete = steps.length > 0 && completed === steps.length;
  const showStats = hasBookings && kpis;
  const clubName = settings?.profile?.name ?? "your club";

  const cancelAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setAutoDismissPending(false);
  }, []);

  useEffect(() => {
    if (loading || dismissed || !allComplete) return;
    if (autoDismissTriggeredRef.current) return;
    autoDismissTriggeredRef.current = true;
    setAutoDismissPending(true);
    autoDismissTimerRef.current = setTimeout(async () => {
      const ts = new Date().toISOString();
      try {
        localStorage.setItem(DISMISS_KEY, ts);
      } catch {
        // ignore
      }
      try {
        await apiFetch("/admin/centers/me", {
          method: "PATCH",
          body: JSON.stringify({ onboardingDismissedAt: ts }),
        });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          setDismissBackendGap(true);
        }
      }
      setAutoDismissPending(false);
      autoDismissTimerRef.current = null;
      setDismissed(true);
    }, 5000);
  }, [loading, dismissed, allComplete]);

  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    };
  }, []);

  if (error && !loading) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="font-display text-3xl text-th-text">Welcome to Snook A Look</h1>
          <p className="mt-1 text-th-text-secondary">Setup checklist could not load.</p>
        </header>
        <ErrorPanel message={error} onRetry={kickFetch} />
      </div>
    );
  }

  if (dismissed && !loading) {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-3 rounded-card border border-th-divider bg-th-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-th-text-tertiary">
              Onboarding skipped
            </div>
            <div className="mt-1 font-display text-lg text-th-text">
              {clubName} setup —{" "}
              <span className="text-th-gold">
                {completed} of {steps.length} complete
              </span>
            </div>
          </div>
          <button
            onClick={handleResume}
            className="rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Resume Onboarding
          </button>
        </div>
        {dismissBackendGap && (
          <div
            className="rounded-card border p-4 text-xs"
            style={{
              borderColor: `${STATUS_TOKEN.WARNING}66`,
              backgroundColor: `${STATUS_TOKEN.WARNING}1A`,
              color: STATUS_TOKEN.WARNING,
            }}
          >
            Cross-device dismiss persistence pending — backend{" "}
            <code>PATCH /v1/admin/centers/me</code> + <code>Center.onboardingDismissedAt</code>{" "}
            column not yet implemented. Dismissed locally on this device; other devices will see
            the full hub until the backend gap closes.
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative mb-8 overflow-hidden rounded-card border border-th-gold/30 bg-gradient-to-br from-[var(--th-card)] via-[var(--th-elevated)] to-[var(--th-bg)] p-8">
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 text-xs text-th-text-tertiary hover:text-th-text"
        >
          Skip setup →
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-th-gold">
          <span>Welcome</span>
        </div>
        <h1 className="mt-2 font-display text-3xl text-th-text">
          Let&apos;s set up{" "}
          <span className="text-th-gold">{clubName}</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-th-text-secondary">
          A short five-step path through Snook A Look&apos;s admin tools — tables, pricing,
          team, first booking, hours. You can come back to this page from the sidebar any time.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-pill border border-th-gold/40 bg-th-gold/10 px-3 py-1 text-xs text-th-gold">
          {completed === steps.length ? "All steps complete ✓" : `${completed} of ${steps.length} done`}
        </div>
      </div>

      {dismissBackendGap && (
        <div
          className="mb-6 rounded-card border p-4 text-xs"
          style={{
            borderColor: `${STATUS_TOKEN.WARNING}66`,
            backgroundColor: `${STATUS_TOKEN.WARNING}1A`,
            color: STATUS_TOKEN.WARNING,
          }}
        >
          Cross-device dismiss persistence pending — backend{" "}
          <code>PATCH /v1/admin/centers/me</code> + <code>Center.onboardingDismissedAt</code>{" "}
          column not yet implemented. This device dismisses locally; other devices will still see
          the hub until the founder ships the backend gap.
        </div>
      )}

      {skipBackendGap && (
        <div
          className="mb-6 rounded-card border p-4 text-xs"
          style={{
            borderColor: `${STATUS_TOKEN.WARNING}66`,
            backgroundColor: `${STATUS_TOKEN.WARNING}1A`,
            color: STATUS_TOKEN.WARNING,
          }}
        >
          Per-step skip persists locally only; backend support pending. Banner self-disposes once{" "}
          <code>centers/me.skippedSteps</code> ships.
        </div>
      )}

      {autoDismissPending && (
        <div
          className="mb-6 flex flex-col gap-2 rounded-card border border-th-gold/40 bg-th-gold/10 p-4 text-sm text-th-text sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <span>
            Onboarding complete — collapsing in 5s. Click &ldquo;Resume Onboarding&rdquo; to revisit
            anytime.
          </span>
          <button
            onClick={cancelAutoDismiss}
            className="self-start rounded-button border border-th-divider px-3 py-1 text-xs hover:bg-th-hover sm:self-auto"
          >
            Stay on hub
          </button>
        </div>
      )}

      {/* Checklist */}
      <div className="mb-8">
        {loading ? (
          <div className="h-64 animate-pulse rounded-card bg-th-card" />
        ) : (
          <OnboardingChecklist steps={steps} onSkip={handleSkipStep} />
        )}
      </div>

      {/* Stats bar (post-first-booking) */}
      {showStats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Bookings" value={String(kpis.totalBookings ?? 0)} />
          <StatCard
            label="Total Revenue"
            value={kpis.totalRevenue !== undefined ? formatAED(kpis.totalRevenue) : "—"}
          />
          <StatCard label="Active Players" value={String(kpis.activePlayers ?? 0)} />
          <StatCard
            label="Table Utilization"
            value={
              kpis.tableUtilization !== undefined
                ? `${Math.round(kpis.tableUtilization * 100)}%`
                : "—"
            }
          />
        </div>
      )}

      {/* Quick links */}
      <div className="mb-8">
        <h2 className="mb-3 font-display text-xl text-th-text">Quick links</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            href={"/bookings" as Route}
            title="Bookings"
            description="Manage incoming bookings, cancellations, and refunds."
          />
          <QuickLinkCard
            href={"/players" as Route}
            title="Players"
            description="Search the player roster, ban repeat no-shows, view history."
          />
          <QuickLinkCard
            href={"/" as Route}
            title="Tables (Floor)"
            description="Live status of every table — available, in play, or reserved."
          />
          <QuickLinkCard
            href={"/earnings" as Route}
            title="Earnings"
            description="Revenue charts, payment history, and KPI snapshots."
          />
          <QuickLinkCard
            href={"/team" as Route}
            title="Team"
            description="Invite staff, set roles, remove access when staff leave."
          />
          <QuickLinkCard
            href={"/settings" as Route}
            title="Settings"
            description="Operating hours, pricing, cancellation policy, and centre info."
          />
        </div>
      </div>

      {/* Help & docs */}
      <footer className="border-t border-th-divider pt-5 text-xs text-th-text-tertiary">
        <a
          href="mailto:hi@snookalook.com"
          className="hover:text-th-gold"
        >
          Contact support → hi@snookalook.com
        </a>
      </footer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card p-4">
      <div className="text-xs text-th-text-tertiary">{label}</div>
      <div className="mt-1 font-mono text-2xl text-th-text">{value}</div>
    </div>
  );
}
