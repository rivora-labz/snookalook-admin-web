"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, ApiError, formatAED, formatDate } from "../../../../lib/api";

interface BookingItem {
  id: string;
  startAt: string;
  endAt: string;
  state: string;
  totalAmountFils: number;
  host: { id: string; displayName: string; avatarUrl: string | null };
}

interface TableDetailResponse {
  id: string;
  tableNumber: number;
  type: string;
  status: string;
  hourlyRate?: number;
  currentBooking: BookingItem | null;
  upcomingBookings: BookingItem[];
  recentBookings: BookingItem[];
  stats30d: {
    revenueFils: number;
    bookedMinutes: number;
    utilization: number; // 0..1
  };
}

const STATE_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CHECKED_IN: "Checked In",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  COMPLETED: "Completed",
};

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="text-xs text-th-text-secondary">{label}</div>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-th-divider" />
      ) : (
        <div className="mt-2 font-mono text-2xl text-th-text">{value}</div>
      )}
    </div>
  );
}

function durationMinutes(b: BookingItem): number {
  return Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60_000);
}

export default function TableDetailPage() {
  const params = useParams<{ id: string }>();
  const tableId = params?.id ?? "";

  const [detail, setDetail] = useState<TableDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await apiFetch<TableDetailResponse>(`/admin/tables/${tableId}`);
      setDetail(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setDetail(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load table detail");
      }
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (tableId) load();
  }, [tableId, load]);

  const kpis = useMemo(() => {
    if (!detail) return null;
    const recent = detail.recentBookings.length;
    const revenueFils = detail.stats30d.revenueFils;
    const avgBookingFils = recent > 0 ? Math.floor(revenueFils / recent) : 0;
    const utilizationPct = Math.min(100, Math.round(detail.stats30d.utilization * 100));
    return { revenueFils, bookings30d: recent, avgBookingFils, utilizationPct };
  }, [detail]);

  const allBookings = useMemo<BookingItem[]>(() => {
    if (!detail) return [];
    const list: BookingItem[] = [];
    if (detail.currentBooking) list.push(detail.currentBooking);
    list.push(...detail.upcomingBookings, ...detail.recentBookings);
    return list.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [detail]);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-block text-xs text-th-text-tertiary hover:text-th-text"
          >
            ← Back to Tables
          </Link>
          <h1 className="font-display text-3xl text-th-text">
            {detail ? `Table #${detail.tableNumber}` : "Table"}
            {detail && (
              <span className="ml-3 text-sm font-normal text-th-text-secondary">{detail.type}</span>
            )}
          </h1>
          <p className="mt-1 text-th-text-secondary">Last 30 days · revenue and bookings</p>
        </div>
      </header>

      {notFound && (
        <div className="flex h-32 items-center justify-center rounded-card border border-th-divider bg-th-card text-xs text-th-text-tertiary">
          Unable to load table — not found.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-5 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={load}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {!notFound && (
        <>
          <div className="mb-8 grid grid-cols-4 gap-4">
            <KpiCard
              label="Revenue (30d)"
              value={kpis ? formatAED(kpis.revenueFils) : ""}
              loading={loading}
            />
            <KpiCard
              label="Bookings (30d)"
              value={kpis ? String(kpis.bookings30d) : ""}
              loading={loading}
            />
            <KpiCard
              label="Avg Booking Value"
              value={kpis ? formatAED(kpis.avgBookingFils) : ""}
              loading={loading}
            />
            <KpiCard
              label="Utilization"
              value={kpis ? `${kpis.utilizationPct}%` : ""}
              loading={loading}
            />
          </div>

          <div className="rounded-card border border-th-divider bg-th-card">
            <div className="border-b border-th-divider px-5 py-3">
              <h2 className="text-sm font-medium text-th-text-secondary">
                Bookings (current · upcoming · last 30 days)
              </h2>
            </div>
            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : allBookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-th-text-tertiary">
                No bookings for this table.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Player</th>
                    <th className="px-5 py-2.5 font-medium">Duration</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map((b) => (
                    <tr key={b.id} className="border-b border-th-divider/50 last:border-b-0">
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {formatDate(b.startAt)}
                      </td>
                      <td className="px-5 py-2.5 text-th-text">{b.host.displayName}</td>
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {(durationMinutes(b) / 60).toFixed(1)}h
                      </td>
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {STATE_LABEL[b.state] ?? b.state}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-th-text">
                        {formatAED(b.totalAmountFils)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
