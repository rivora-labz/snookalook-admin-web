"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { BookingState } from "@rivora-labz/snook-shared/enums";
import { apiFetch, ApiError } from "../lib/api";
import { STATUS_TOKEN, STATUS_TOKEN_TEXT } from "../lib/status-tokens";

// ─── Constants ───────────────────────────────────────────────────────────────
const TIMELINE_START_HOUR = 8;
const TIMELINE_HOURS = 18; // 08:00 → 02:00 (+1 day)
const SLOT_COUNT = TIMELINE_HOURS * 2; // 36 half-hour slots
const SLOT_HEIGHT_PX = 24; // px per 30-min slot
const TOTAL_HEIGHT_PX = SLOT_COUNT * SLOT_HEIGHT_PX; // 864px
const TIME_COL_W = 52; // px — left time label column
const TABLE_COL_W = 76; // px per table sub-column

// ─── Types ───────────────────────────────────────────────────────────────────
interface CalBookingItem {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  state: BookingState;
  host: { displayName: string };
  table: { id: string; tableNumber: number; type: string } | null;
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function getWeekBounds(offset: number): { start: Date; end: Date; days: string[] } {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(toDateStr(d));
  }

  const end = new Date(monday);
  end.setDate(monday.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start: monday, end, days };
}

function formatWeekRange(days: string[]): string {
  const fmt = (ds: string) => {
    const d = new Date(ds + "T12:00:00");
    return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
  };
  return `${fmt(days[0]!)} – ${fmt(days[6]!)}`;
}

function formatDayLabel(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { day: DAY[d.getDay()]!, date: `${d.getDate()}` };
}

function bookingSlots(
  b: CalBookingItem,
  dateStr: string,
): { topPx: number; heightPx: number } | null {
  const dayBase = new Date(`${dateStr}T00:00:00`);
  const tlStart = dayBase.getTime() + TIMELINE_START_HOUR * 3600_000;
  const tlEnd = tlStart + TIMELINE_HOURS * 3600_000;

  const startMs = new Date(b.startAt).getTime();
  const endMs = new Date(b.endAt).getTime();

  if (startMs >= tlEnd || endMs <= tlStart) return null;

  const clampedStart = Math.max(startMs, tlStart);
  const clampedEnd = Math.min(endMs, tlEnd);
  const startSlot = (clampedStart - tlStart) / (30 * 60_000);
  const endSlot = (clampedEnd - tlStart) / (30 * 60_000);

  return {
    topPx: Math.max(0, startSlot) * SLOT_HEIGHT_PX,
    heightPx: Math.max(8, (endSlot - Math.max(0, startSlot)) * SLOT_HEIGHT_PX),
  };
}

function nowTopPx(dateStr: string): number | null {
  const dayBase = new Date(`${dateStr}T00:00:00`);
  const tlStart = dayBase.getTime() + TIMELINE_START_HOUR * 3600_000;
  const tlEnd = tlStart + TIMELINE_HOURS * 3600_000;
  const nowMs = Date.now();
  if (nowMs < tlStart || nowMs > tlEnd) return null;
  return ((nowMs - tlStart) / (tlEnd - tlStart)) * TOTAL_HEIGHT_PX;
}

function buildHourLabels(): string[] {
  return Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
    const h = (TIMELINE_START_HOUR + i) % 24;
    return `${h.toString().padStart(2, "0")}:00`;
  });
}

const HOUR_LABELS = buildHourLabels();

// ─── Status tokens ───────────────────────────────────────────────────────────
const STATE_COLOR: Record<string, string> = {
  CONFIRMED: STATUS_TOKEN.ACTIVE,
  PENDING: STATUS_TOKEN.WARNING,
  CHECKED_IN: STATUS_TOKEN.ACTIVE,
  IN_PLAY: STATUS_TOKEN.ACTIVE,
  CANCELLED: STATUS_TOKEN.NEUTRAL,
  NO_SHOW: STATUS_TOKEN.FAILURE,
  COMPLETED: STATUS_TOKEN.SUCCESS,
};
const STATE_TEXT: Record<string, string> = {
  CONFIRMED: STATUS_TOKEN_TEXT.ACTIVE,
  PENDING: STATUS_TOKEN_TEXT.WARNING,
  CHECKED_IN: STATUS_TOKEN_TEXT.ACTIVE,
  IN_PLAY: STATUS_TOKEN_TEXT.ACTIVE,
  CANCELLED: STATUS_TOKEN_TEXT.NEUTRAL,
  NO_SHOW: STATUS_TOKEN_TEXT.FAILURE,
  COMPLETED: STATUS_TOKEN_TEXT.SUCCESS,
};

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  activeCenterId: string | null;
}

export default function BookingsCalendarView({ activeCenterId }: Props) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<CalBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowPx, setNowPx] = useState<{ dateStr: string; px: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { start, end, days } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const fetchWeek = useCallback(
    async (
      weekStart: Date,
      weekEnd: Date,
      centerId: string | null,
      signal: AbortSignal,
    ) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
          limit: "200",
        });
        if (centerId) qs.set("centerId", centerId);
        const data = await apiFetch<{ items: CalBookingItem[] }>(
          `/admin/bookings?${qs.toString()}`,
          { signal },
        );
        if (signal.aborted) return;
        setBookings(data.items);
        setError(null);
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.code === "ABORTED") return;
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [],
  );

  const kickFetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchWeek(start, end, activeCenterId, controller.signal);
  }, [fetchWeek, start, end, activeCenterId]);

  useEffect(() => {
    kickFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [kickFetch]);

  // Now-indicator tick
  useEffect(() => {
    const update = () => {
      const today = toDateStr(new Date());
      const px = nowTopPx(today);
      setNowPx(px !== null ? { dateStr: today, px } : null);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Group: day → tableId → bookings
  const grouped = useMemo(() => {
    const byDay = new Map<string, Map<string, CalBookingItem[]>>();
    for (const d of days) byDay.set(d, new Map());
    for (const b of bookings) {
      const dayStr = b.startAt.slice(0, 10);
      if (!byDay.has(dayStr)) continue;
      const tId = b.table?.id ?? "__no_table__";
      const dm = byDay.get(dayStr)!;
      if (!dm.has(tId)) dm.set(tId, []);
      dm.get(tId)!.push(b);
    }
    return byDay;
  }, [bookings, days]);

  // All tables across the week sorted by tableNumber
  const tables = useMemo(() => {
    const map = new Map<string, { id: string; tableNumber: number; type: string }>();
    for (const b of bookings) {
      if (b.table && !map.has(b.table.id)) map.set(b.table.id, b.table);
    }
    return Array.from(map.values()).sort((a, b) => a.tableNumber - b.tableNumber);
  }, [bookings]);

  const tableCols = Math.max(tables.length, 1);
  const today = toDateStr(new Date());

  return (
    <div>
      {/* ── Week nav ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-button border border-th-divider bg-th-bg p-0.5">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-button px-3 py-1.5 text-sm text-th-text-secondary hover:bg-th-hover"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`rounded-button px-3 py-1.5 text-sm font-medium transition-colors ${
              weekOffset === 0
                ? "bg-th-gold text-black"
                : "text-th-text-secondary hover:bg-th-hover"
            }`}
          >
            This week
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-button px-3 py-1.5 text-sm text-th-text-secondary hover:bg-th-hover"
          >
            Next →
          </button>
        </div>
        <span className="text-sm text-th-text-secondary">{formatWeekRange(days)}</span>
      </div>

      {/* ── Mobile fallback ── */}
      <div className="block md:hidden rounded-card border border-th-divider bg-th-card p-6 text-center text-sm text-th-text-secondary">
        Week view is optimised for desktop. Switch to List view or use a wider screen.
      </div>

      {/* ── Calendar grid (desktop) ── */}
      <div className="hidden md:block">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-card border border-[#E74C3C]/40 bg-[#E74C3C]/10 p-4 text-sm text-[#E74C3C]">
            <span>{error}</span>
            <button
              onClick={kickFetch}
              className="ml-4 rounded-button border border-[#E74C3C]/60 px-3 py-1 text-xs font-medium text-[#E74C3C] hover:bg-[#E74C3C]/10"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="overflow-x-auto rounded-card border border-th-divider bg-th-card">
            <div className="flex">
              <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0" />
              {days.map((d) => (
                <div
                  key={d}
                  className="flex-1 border-l border-th-divider p-2"
                  style={{ minWidth: TABLE_COL_W }}
                >
                  <div className="h-4 w-12 animate-pulse rounded bg-th-divider" />
                  <div className="mt-16 h-10 animate-pulse rounded bg-th-divider opacity-60" />
                  <div className="mt-4 h-16 animate-pulse rounded bg-th-divider opacity-40" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-th-divider bg-th-card">
            <div
              style={{
                minWidth: TIME_COL_W + days.length * tableCols * TABLE_COL_W + days.length,
              }}
            >
              {/* ── Day headers ── */}
              <div className="sticky top-0 z-20 flex border-b border-th-divider bg-th-bg">
                <div
                  style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
                  className="shrink-0 border-r border-th-divider"
                />
                {days.map((d) => {
                  const { day, date } = formatDayLabel(d);
                  const isToday = d === today;
                  return (
                    <div
                      key={d}
                      className={`border-l border-th-divider px-2 py-2 text-center text-xs font-medium ${
                        isToday ? "bg-th-gold-bg text-th-gold" : "text-th-text-secondary"
                      }`}
                      style={{ minWidth: tableCols * TABLE_COL_W }}
                    >
                      <div className="font-semibold">{day} {date}</div>
                      {/* Table sub-headers */}
                      {tables.length > 0 && (
                        <div className="mt-1 flex text-[9px] text-th-text-tertiary">
                          {tables.map((t) => (
                            <div
                              key={t.id}
                              className="truncate text-center"
                              style={{ width: TABLE_COL_W }}
                            >
                              #{t.tableNumber}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Time body ── */}
              <div className="flex" style={{ height: TOTAL_HEIGHT_PX }}>
                {/* Time label column */}
                <div
                  style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
                  className="relative shrink-0 border-r border-th-divider"
                >
                  {HOUR_LABELS.map((label, i) => (
                    <div
                      key={label}
                      className="absolute right-2 select-none text-[10px] text-th-text-tertiary"
                      style={{ top: i * SLOT_HEIGHT_PX * 2 - 6, lineHeight: "1" }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((d) => {
                  const isToday = d === today;
                  const dayMap = grouped.get(d);
                  const nowIndicator =
                    isToday && nowPx?.dateStr === d ? nowPx.px : null;

                  return (
                    <div
                      key={d}
                      className={`relative flex border-l border-th-divider ${isToday ? "bg-th-gold/[0.04]" : ""}`}
                      style={{ minWidth: tableCols * TABLE_COL_W, height: TOTAL_HEIGHT_PX }}
                    >
                      {/* Hour lines */}
                      {HOUR_LABELS.map((_, i) => (
                        <div
                          key={i}
                          className="pointer-events-none absolute inset-x-0 border-t border-th-divider/30"
                          style={{ top: i * SLOT_HEIGHT_PX * 2 }}
                        />
                      ))}
                      {/* Half-hour lines */}
                      {Array.from({ length: TIMELINE_HOURS }).map((_, i) => (
                        <div
                          key={`h-${i}`}
                          className="pointer-events-none absolute inset-x-0 border-t border-th-divider/10"
                          style={{ top: (i * 2 + 1) * SLOT_HEIGHT_PX }}
                        />
                      ))}

                      {/* Now indicator */}
                      {nowIndicator !== null && (
                        <div
                          className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-th-gold"
                          style={{ top: nowIndicator }}
                        >
                          <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-th-gold" />
                        </div>
                      )}

                      {/* Table sub-columns */}
                      {tables.length === 0 ? (
                        <div style={{ width: TABLE_COL_W }} />
                      ) : (
                        tables.map((t, ti) => {
                          const tBookings = dayMap?.get(t.id) ?? [];
                          return (
                            <div
                              key={t.id}
                              className="relative"
                              style={{
                                width: TABLE_COL_W,
                                minWidth: TABLE_COL_W,
                                height: TOTAL_HEIGHT_PX,
                                borderLeft:
                                  ti > 0
                                    ? "1px solid color-mix(in srgb, var(--th-divider) 40%, transparent)"
                                    : undefined,
                              }}
                            >
                              {tBookings.map((b) => {
                                const pos = bookingSlots(b, d);
                                if (!pos) return null;
                                const color = STATE_COLOR[b.state] ?? "#6B6B6B";
                                const textColor = STATE_TEXT[b.state] ?? "#FFFFFF";
                                return (
                                  <button
                                    key={b.id}
                                    onClick={() =>
                                      router.push(`/bookings/${b.id}` as Route)
                                    }
                                    aria-label={`${b.host.displayName} table #${t.tableNumber} — ${b.state}`}
                                    title={`${b.host.displayName} · Table #${t.tableNumber} · ${b.durationMinutes / 60}h · ${b.state}`}
                                    className="absolute inset-x-0.5 z-10 overflow-hidden rounded px-1 py-0.5 text-[9px] font-medium leading-tight transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-th-gold"
                                    style={{
                                      top: pos.topPx + 1,
                                      height: Math.max(pos.heightPx - 2, 6),
                                      backgroundColor: color,
                                      color: textColor,
                                      opacity: b.state === "CANCELLED" ? 0.45 : 1,
                                    }}
                                  >
                                    <span className="block truncate">
                                      {b.host.displayName}
                                    </span>
                                    {pos.heightPx >= 40 && (
                                      <span className="block truncate opacity-70">
                                        {b.durationMinutes / 60}h
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {bookings.length === 0 && (
              <div className="py-10 text-center text-sm text-th-text-secondary">
                No bookings this week.
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-th-text-secondary">
          {Object.entries(STATE_COLOR).map(([state, color]) => (
            <div key={state} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor: color,
                  opacity: state === "CANCELLED" ? 0.45 : 1,
                }}
              />
              {state.charAt(0) + state.slice(1).toLowerCase().replace("_", " ")}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 rounded-full bg-th-gold" />
            Now
          </div>
        </div>
      </div>
    </div>
  );
}
