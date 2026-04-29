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
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="text-xs text-th-text-secondary">{label}</div>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-th-divider" />
      ) : (
        <div className="mt-2 font-mono text-2xl text-th-text">{value}</div>
      )}
    </div>
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

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">
          Dashboard — {getGreeting()}
        </h1>
        <p className="mt-1 text-th-text-secondary">Center overview</p>
      </header>

      {error && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchDashboard(); }}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <KpiCard
          label="Tables In Use"
          value={kpis ? String(kpis.tablesInUse) : ""}
          loading={loading}
        />
        <KpiCard
          label="Active Bookings Today"
          value={kpis ? String(kpis.activeBookings) : ""}
          loading={loading}
        />
        <KpiCard
          label="Revenue Today"
          value={kpis ? formatAED(kpis.revenueToday) : ""}
          loading={loading}
        />
        <KpiCard
          label="New Players This Week"
          value={kpis ? String(kpis.newPlayersThisWeek) : ""}
          loading={loading}
        />
      </div>

      {/* Activity feed */}
      <div className="rounded-card border border-th-divider bg-th-card">
        <div className="border-b border-th-divider px-5 py-3">
          <h2 className="text-sm font-medium text-th-text-secondary">Recent Activity</h2>
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
              <li key={item.bookingId} className="flex items-center gap-3 px-5 py-3">
                <span className="text-base">{ACTIVITY_ICON[item.type] ?? "📋"}</span>
                <div className="flex-1 text-sm">
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
      </div>
    </div>
  );
}
