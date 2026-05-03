"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, formatAED } from "../../../lib/api";

interface DashboardKpis {
  tablesInUse: number;
  activeBookings: number;
  revenueToday: number;
  newPlayersThisWeek: number;
}

interface ActivityItem {
  type: "booking" | "checkin" | "cancellation";
  bookingId: string;
  host: { id: string; displayName: string; avatarUrl: string | null };
  table: { tableNumber: number; type: string };
  state: string;
  startAt: string;
  createdAt: string;
}

const ACTIVITY_ICON: Record<string, string> = {
  booking: "📅",
  checkin: "✅",
  cancellation: "❌",
};

const ACTIVITY_VERB: Record<string, string> = {
  booking: "booked",
  checkin: "checked in at",
  cancellation: "cancelled",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-th-divider bg-th-card p-6">
      <div className="text-[11px] uppercase tracking-[0.2em] text-th-text-tertiary">{label}</div>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-th-divider" />
      ) : (
        <div className="mt-3 font-mono text-3xl text-th-text">{value}</div>
      )}
      <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-full bg-[#D4AF37]/5 blur-2xl" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [kpiRes, activityRes] = await Promise.all([
        apiFetch<DashboardKpis>("/admin/dashboard/kpis"),
        apiFetch<{ items: ActivityItem[] }>("/admin/dashboard/activity"),
      ]);
      setKpis(kpiRes);
      setActivity(activityRes.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const schedule = activity
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 6);

  const tableHighlights = Array.from({ length: 8 }).map((_, index) => {
    const item = activity[index];
    const tableNumber = item?.table.tableNumber ?? index + 1;
    const status = item?.type === "cancellation"
      ? "Available"
      : item?.type === "checkin"
      ? "In Use"
      : item
      ? "Reserved"
      : "Available";

    return {
      id: tableNumber,
      label: `Table ${String(tableNumber).padStart(2, "0")}`,
      status,
      detail:
        item?.host.displayName ??
        (status === "Available" ? "Ready now" : "Awaiting next player"),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-th-text">Dashboard</h1>
          <p className="mt-2 text-th-text-secondary">
            {getGreeting()}. Live overview of tables, bookings, and revenue.
          </p>
        </div>
        <div className="rounded-full border border-th-divider bg-th-card px-4 py-2 text-xs uppercase tracking-[0.22em] text-th-text-tertiary">
          Auto-refreshing every 30s
        </div>
      </header>

      {error && (
        <div className="rounded-[20px] border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchDashboard();
            }}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue Today"
          value={kpis ? formatAED(kpis.revenueToday) : ""}
          loading={loading}
        />
        <KpiCard
          label="Tables In Use"
          value={kpis ? String(kpis.tablesInUse) : ""}
          loading={loading}
        />
        <KpiCard
          label="Active Bookings"
          value={kpis ? String(kpis.activeBookings) : ""}
          loading={loading}
        />
        <KpiCard
          label="New Players This Week"
          value={kpis ? String(kpis.newPlayersThisWeek) : ""}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <section className="rounded-[24px] border border-th-divider bg-th-card p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-th-text">Live Table Status</h2>
              <p className="mt-1 text-sm text-th-text-secondary">Current occupancy and handoff readiness.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-th-text-tertiary">
              <LegendDot color="#2ECC71" label="Available" />
              <LegendDot color="#D4AF37" label="In Use" />
              <LegendDot color="#3498DB" label="Reserved" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tableHighlights.map((table) => (
              <div
                key={table.id}
                className="rounded-[18px] border border-th-divider bg-th-elevated p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-base text-th-text">{table.label}</div>
                    <div className="mt-1 text-xs text-th-text-tertiary">{table.detail}</div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor:
                        table.status === "Available"
                          ? "rgba(46,204,113,0.12)"
                          : table.status === "In Use"
                          ? "rgba(212,175,55,0.12)"
                          : "rgba(52,152,219,0.12)",
                      color:
                        table.status === "Available"
                          ? "#2ECC71"
                          : table.status === "In Use"
                          ? "#D4AF37"
                          : "#3498DB",
                    }}
                  >
                    {table.status}
                  </span>
                </div>
                <div className="mt-6 h-24 rounded-[14px] border border-th-divider bg-[linear-gradient(180deg,rgba(11,61,46,0.2),rgba(11,61,46,0.05))]" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-th-divider bg-th-card p-6">
          <div className="mb-5">
            <h2 className="font-display text-xl text-th-text">Today&apos;s Schedule</h2>
            <p className="mt-1 text-sm text-th-text-secondary">Upcoming check-ins and reserved slots.</p>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-th-divider" />
              ))}
            </div>
          ) : schedule.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-th-divider px-4 py-10 text-center text-sm text-th-text-tertiary">
              No upcoming bookings today.
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((item) => (
                <div
                  key={`${item.bookingId}-${item.startAt}`}
                  className="flex items-center gap-4 rounded-[18px] border border-th-divider bg-th-elevated px-4 py-3"
                >
                  <div className="w-16 shrink-0 font-mono text-sm text-th-text">
                    {new Date(item.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="h-10 w-px bg-th-divider" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-th-text">{item.host.displayName}</div>
                    <div className="truncate text-xs text-th-text-tertiary">Table #{item.table.tableNumber} · {item.table.type}</div>
                  </div>
                  <span className="text-xs text-th-text-tertiary">{timeAgo(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[24px] border border-th-divider bg-th-card">
        <div className="flex items-center justify-between border-b border-th-divider px-6 py-4">
          <h2 className="font-display text-xl text-th-text">Recent Activity</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-th-text-tertiary">
            {activity.length} events
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="p-8 text-center text-sm text-th-text-tertiary">No recent activity.</div>
        ) : (
          <ul className="divide-y divide-th-divider">
            {activity.map((item) => (
              <li key={item.bookingId} className="flex items-center gap-4 px-6 py-4">
                <span className="text-base">{ACTIVITY_ICON[item.type] ?? "📋"}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-th-text">{item.host.displayName}</span>{" "}
                  <span className="text-th-text-secondary">
                    {ACTIVITY_VERB[item.type] ?? item.type} Table #{item.table.tableNumber}
                  </span>
                </div>
                <span className="text-xs text-th-text-tertiary">{timeAgo(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
