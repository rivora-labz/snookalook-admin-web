"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { BookingState } from "@rivora-labz/snook-shared";
import { apiFetch, formatAED } from "../../../lib/api";
import { useRealtimeBookings } from "../../../hooks/useRealtimeBookings";

type StatusFilter = "ALL" | BookingState;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "COMPLETED", label: "Completed" },
];

interface BookingItem {
  id: string;
  tableId: string;
  hostUserId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  state: BookingState;
  totalAmount: number;
  host: { id: string; displayName: string; avatarUrl: string | null };
  table: { id: string; tableNumber: number; type: string };
  payment: { status: string; method: string } | null;
}

const STATE_COLOR: Record<string, string> = {
  CONFIRMED: "#0B3D2E",
  PENDING: "#F39C12",
  CHECKED_IN: "#3498DB",
  CANCELLED: "#6B6B6B",
  NO_SHOW: "#E74C3C",
  COMPLETED: "#0B3D2E",
};

const STATE_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CHECKED_IN: "Checked In",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  COMPLETED: "Completed",
};

// Timeline: 08:00 to 02:00 next day = 18 hours = 36 half-hour slots
const TIMELINE_START_HOUR = 8;
const TIMELINE_HOURS = 18;
const SLOT_COUNT = TIMELINE_HOURS * 2;

function getSlotLabels(): string[] {
  const labels: string[] = [];
  for (let i = 0; i <= SLOT_COUNT; i++) {
    const totalMinutes = (TIMELINE_START_HOUR * 60) + (i * 30);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const min = totalMinutes % 60;
    if (min === 0) {
      labels.push(`${hour.toString().padStart(2, "0")}:00`);
    }
  }
  return labels;
}

function bookingToGridPosition(startAt: string, endAt: string, dateStr: string) {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const timelineStartMs = dayStart.getTime() + TIMELINE_START_HOUR * 3600_000;
  const timelineEndMs = timelineStartMs + TIMELINE_HOURS * 3600_000;

  const startMs = Math.max(new Date(startAt).getTime(), timelineStartMs);
  const endMs = Math.min(new Date(endAt).getTime(), timelineEndMs);

  if (startMs >= timelineEndMs || endMs <= timelineStartMs) return null;

  const startSlot = (startMs - timelineStartMs) / (30 * 60_000);
  const endSlot = (endMs - timelineStartMs) / (30 * 60_000);

  return { start: Math.max(0, startSlot), end: Math.min(SLOT_COUNT, endSlot) };
}

function nowIndicatorPosition(dateStr: string): number | null {
  const now = new Date();
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const timelineStartMs = dayStart.getTime() + TIMELINE_START_HOUR * 3600_000;
  const timelineEndMs = timelineStartMs + TIMELINE_HOURS * 3600_000;
  const nowMs = now.getTime();

  if (nowMs < timelineStartMs || nowMs > timelineEndMs) return null;
  return ((nowMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * 100;
}

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

export default function BookingsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(formatToday);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [nowPercent, setNowPercent] = useState<number | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const from = new Date(`${date}T00:00:00`).toISOString();
      const to = new Date(`${date}T23:59:59`).toISOString();
      const data = await apiFetch<{ items: BookingItem[] }>(
        `/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`
      );
      setBookings(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchBookings(selectedDate);
  }, [fetchBookings, selectedDate]);

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate, fetchBookings]);

  useEffect(() => {
    apiFetch<{ staffMember: { centerId: string } }>("/staff/me")
      .then((r) => setCenterId(r.staffMember.centerId))
      .catch(() => {});
  }, []);

  useRealtimeBookings(centerId, refetch);

  useEffect(() => {
    const update = () => setNowPercent(nowIndicatorPosition(selectedDate));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === "ALL") return bookings;
    return bookings.filter((b) => b.state === statusFilter);
  }, [bookings, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<BookingState, number>> = {};
    for (const b of bookings) counts[b.state] = (counts[b.state] ?? 0) + 1;
    return counts;
  }, [bookings]);

  const tableRows = useMemo(() => {
    const tableMap = new Map<string, { id: string; tableNumber: number; type: string; bookings: BookingItem[] }>();
    for (const b of filteredBookings) {
      if (!tableMap.has(b.table.id)) {
        tableMap.set(b.table.id, { ...b.table, bookings: [] });
      }
      tableMap.get(b.table.id)!.bookings.push(b);
    }
    return Array.from(tableMap.values()).sort((a, b) => a.tableNumber - b.tableNumber);
  }, [filteredBookings]);

  const slotLabels = useMemo(() => getSlotLabels(), []);

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-th-text">
              Bookings — {formatDisplayDate(selectedDate)}
            </h1>
            <p className="mt-1 text-th-text-secondary">Timeline view across tables</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-input border border-th-divider bg-th-card px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              aria-label="Filter by status"
            >
              {FILTER_OPTIONS.map((opt) => {
                const count =
                  opt.value === "ALL"
                    ? bookings.length
                    : statusCounts[opt.value as BookingState] ?? 0;
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({count})
                  </option>
                );
              })}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-input border border-th-divider bg-th-card px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
            />
          </div>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-24 shrink-0 animate-pulse rounded bg-th-divider h-10" />
                <div className="flex-1 animate-pulse rounded bg-th-card h-10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
            <p className="text-[#E74C3C]">{error}</p>
            <button
              onClick={() => fetchBookings(selectedDate)}
              className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
            >
              Retry
            </button>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="rounded-card border border-th-divider bg-th-card p-8 text-center text-th-text-secondary">
            {statusFilter === "ALL"
              ? "No bookings for this date."
              : `No ${STATE_LABEL[statusFilter] ?? statusFilter} bookings for this date.`}
          </div>
        ) : (
          <div className="rounded-card border border-th-divider bg-th-card overflow-x-auto">
            {/* Time header */}
            <div className="flex border-b border-th-divider">
              <div className="w-28 shrink-0 border-r border-th-divider px-3 py-2 text-xs font-medium text-th-text-secondary">
                Table
              </div>
              <div className="relative flex-1 min-w-[900px]">
                <div className="flex">
                  {slotLabels.map((label) => (
                    <div
                      key={label}
                      className="flex-1 border-r border-th-divider/50 px-1 py-2 text-center text-[10px] text-th-text-tertiary"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table rows */}
            {tableRows.map((row) => (
              <div key={row.id} className="flex border-b border-th-divider/50 last:border-b-0">
                <div className="w-28 shrink-0 border-r border-th-divider px-3 py-3 text-sm text-th-text">
                  <span className="font-mono">{row.tableNumber}</span>
                  <span className="ml-1 text-[10px] text-th-text-tertiary">{row.type}</span>
                </div>
                <div className="relative flex-1 min-w-[900px] py-1">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {slotLabels.map((label) => (
                      <div key={label} className="flex-1 border-r border-th-divider/20" />
                    ))}
                  </div>

                  {/* Now indicator */}
                  {nowPercent !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-th-gold z-20"
                      style={{ left: `${nowPercent}%` }}
                    />
                  )}

                  {/* Booking blocks */}
                  {row.bookings.map((b) => {
                    const pos = bookingToGridPosition(b.startAt, b.endAt, selectedDate);
                    if (!pos) return null;
                    const leftPct = (pos.start / SLOT_COUNT) * 100;
                    const widthPct = ((pos.end - pos.start) / SLOT_COUNT) * 100;
                    const color = STATE_COLOR[b.state] ?? "#6B6B6B";
                    const isCancelled = b.state === "CANCELLED";

                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        onDoubleClick={() => router.push(`/bookings/${b.id}` as Route)}
                        className="absolute top-1 bottom-1 z-10 flex items-center overflow-hidden rounded px-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: color,
                          opacity: isCancelled ? 0.5 : 1,
                        }}
                        title={`${b.host.displayName} — ${STATE_LABEL[b.state]} · double-click to open`}
                      >
                        <span className="truncate">
                          {b.host.displayName} ({b.durationMinutes / 60}h)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-th-text-secondary">
          {Object.entries(STATE_COLOR).map(([state, color]) => (
            <div key={state} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: color, opacity: state === "CANCELLED" ? 0.5 : 1 }}
              />
              {STATE_LABEL[state] ?? state}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-0.5 bg-th-gold" />
            Now
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedBooking && (
        <div className="ml-4 w-80 shrink-0 rounded-card border border-th-divider bg-th-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg text-th-text">Booking Details</h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="text-th-text-tertiary hover:text-th-text"
            >
              &times;
            </button>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-th-text-tertiary">Player</dt>
              <dd className="mt-0.5 text-th-text">{selectedBooking.host.displayName}</dd>
            </div>
            <div>
              <dt className="text-th-text-tertiary">Table</dt>
              <dd className="mt-0.5 text-th-text">
                #{selectedBooking.table.tableNumber} — {selectedBooking.table.type}
              </dd>
            </div>
            <div>
              <dt className="text-th-text-tertiary">Time</dt>
              <dd className="mt-0.5 text-th-text">
                {new Date(selectedBooking.startAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {new Date(selectedBooking.endAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {" "}({selectedBooking.durationMinutes / 60}h)
              </dd>
            </div>
            <div>
              <dt className="text-th-text-tertiary">Status</dt>
              <dd className="mt-0.5">
                <span
                  className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: STATE_COLOR[selectedBooking.state] }}
                >
                  {STATE_LABEL[selectedBooking.state]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-th-text-tertiary">Amount</dt>
              <dd className="mt-0.5 text-th-text">{formatAED(selectedBooking.totalAmount)}</dd>
            </div>
          </dl>

          <button
            onClick={() => router.push(`/bookings/${selectedBooking.id}` as Route)}
            className="mt-5 w-full rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            View Full Detail →
          </button>
        </div>
      )}
    </div>
  );
}
