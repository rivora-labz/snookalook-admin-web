"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, EnvelopeSimple } from "phosphor-react";
import BookingsCalendarView, {
  type CalBookingItem,
} from "../../../components/BookingsCalendarView";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useActiveCenterId } from "../../../lib/active-center";
import { useAdmin } from "../../../lib/AdminContext";
import { apiFetch, formatAED } from "../../../lib/api";
import { formatDateShort, formatTime } from "../../../lib/datetime";

interface BookingKpis {
  revenueToday: number;
  bookingsCount?: number;
}

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  CONFIRMED: {
    label: "CONFIRMED",
    bg: "bg-[#D4AF37]/10",
    text: "text-[#D4AF37]",
    border: "border-[#D4AF37]/30",
  },
  PENDING: {
    label: "PENDING",
    bg: "bg-[#3498DB]/10",
    text: "text-[#3498DB]",
    border: "border-[#3498DB]/30",
  },
  CHECKED_IN: {
    label: "CHECKED IN",
    bg: "bg-[#2ECC71]/10",
    text: "text-[#2ECC71]",
    border: "border-[#2ECC71]/30",
  },
  IN_PLAY: {
    label: "IN PLAY",
    bg: "bg-[#D4AF37]/10",
    text: "text-[#D4AF37]",
    border: "border-[#D4AF37]/30",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-[#6B6B6B]/10",
    text: "text-[#6B6B6B]",
    border: "border-[#6B6B6B]/30",
  },
  NO_SHOW: {
    label: "NO SHOW",
    bg: "bg-[#E74C3C]/10",
    text: "text-[#E74C3C]",
    border: "border-[#E74C3C]/30",
  },
  COMPLETED: {
    label: "COMPLETED",
    bg: "bg-[#2ECC71]/10",
    text: "text-[#2ECC71]",
    border: "border-[#2ECC71]/30",
  },
};

function formatTimeRange(startAt: string, endAt: string): string {
  const dateLabel = formatDateShort(startAt, { weekday: "short" });
  return `${dateLabel}, ${formatTime(startAt)} – ${formatTime(endAt)}`;
}

export default function BookingsPage() {
  const activeCenterId = useActiveCenterId();
  const { setIsBookingOpen } = useAdmin();
  const [selected, setSelected] = useState<CalBookingItem | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [bookingKpis, setBookingKpis] = useState<BookingKpis | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState(false);

  const fetchBookingKpis = useCallback(async () => {
    try {
      const data = await apiFetch<{ kpis: BookingKpis }>("/admin/analytics?period=1d");
      setBookingKpis(data.kpis);
      setKpiError(false);
    } catch {
      setKpiError(true);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookingKpis(); }, [fetchBookingKpis]);

  const retryBookingKpis = useCallback(() => {
    setKpiLoading(true);
    fetchBookingKpis();
  }, [fetchBookingKpis]);

  const badge = selected ? (STATUS_BADGE[selected.state] ?? STATUS_BADGE.PENDING) : null;

  return (
    <div className="flex flex-col h-full bg-th-bg -m-8 pb-12">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-6 flex items-center justify-between">
        <h1 className="font-display text-[24px] font-semibold text-th-text">
          Bookings
        </h1>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 h-[40px] bg-th-card border border-th-border rounded-lg text-[13px] font-medium text-th-text hover:bg-th-divider transition-colors">
            <Calendar size={18} />
            <span>This Week</span>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="var(--th-text-tertiary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsBookingOpen(true)}
            className="h-[40px] px-5 rounded-lg bg-[#D4AF37] hover:bg-[#F7D774] text-black font-display text-[14px] font-semibold shadow-gold-glow transition-colors"
          >
            + New Booking
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="px-8 mb-6">
        {kpiError && !kpiLoading && (
          <div
            role="alert"
            className="mb-3 flex items-center justify-between rounded-xl border border-[#E74C3C]/40 bg-th-card px-4 py-3"
          >
            <span className="font-inter text-[13px] text-[#E74C3C]">
              Could not load booking stats.
            </span>
            <button
              type="button"
              onClick={retryBookingKpis}
              aria-label="Retry loading booking stats"
              className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#F7D774] transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <div className="h-[80px] bg-th-card rounded-xl border border-th-divider flex items-center divide-x divide-th-border">
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Total bookings today
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[20px] font-bold text-th-text leading-none">
                {kpiLoading ? "..." : kpiError ? "--" : (bookingKpis?.bookingsCount ?? "--")}
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Revenue today
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[20px] font-bold text-th-text leading-none">
                {kpiLoading ? "..." : kpiError ? "--" : formatAED(bookingKpis?.revenueToday ?? 0)}
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Cancellation rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[20px] font-bold text-th-text leading-none">
                {kpiLoading ? "..." : "--"}
              </span>
              <span className="font-inter text-[12px] text-th-text-tertiary">—</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 70/30 Split */}
      <div className="flex-1 flex gap-6 px-8 overflow-hidden min-h-[600px]">
        {/* Left: Calendar (70%) */}
        <div className="flex-[7] overflow-hidden">
          <BookingsCalendarView
            activeCenterId={activeCenterId}
            onSelectBooking={setSelected}
          />
        </div>

        {/* Right: Detail Panel (30%) */}
        <div className="flex-[3] bg-th-card rounded-xl border border-th-divider flex flex-col overflow-hidden">
          {selected ? (
            <div className="p-6 h-full flex flex-col">
              {/* Player header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    url={null}
                    name={selected.host.displayName}
                    size={48}
                    className="border border-th-border-medium"
                  />
                  <div>
                    <h2 className="font-display text-[18px] font-semibold text-th-text">
                      {selected.host.displayName}
                    </h2>
                    <div className="font-inter text-[12px] text-th-text-tertiary mt-0.5">
                      +971 50 000 0000
                    </div>
                  </div>
                </div>
                {badge && (
                  <div
                    className={`${badge.bg} ${badge.text} border ${badge.border} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded`}
                  >
                    {badge.label}
                  </div>
                )}
              </div>

              {/* Detail rows */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-th-divider">
                  <span className="font-inter text-[13px] text-th-text-tertiary">
                    Table
                  </span>
                  <span className="font-inter text-[14px] font-medium text-th-text">
                    {selected.table
                      ? `Table ${selected.table.tableNumber.toString().padStart(2, "0")} · ${selected.table.type}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-th-divider">
                  <span className="font-inter text-[13px] text-th-text-tertiary">
                    Time
                  </span>
                  <span className="font-inter text-[14px] font-medium text-th-text flex items-center gap-2">
                    <Clock size={16} className="text-[#D4AF37]" />
                    {formatTimeRange(selected.startAt, selected.endAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-th-divider">
                  <span className="font-inter text-[13px] text-th-text-tertiary">
                    Duration
                  </span>
                  <span className="font-inter text-[14px] font-medium text-th-text">
                    {selected.durationMinutes / 60}{" "}
                    {selected.durationMinutes / 60 === 1 ? "hour" : "hours"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-th-divider">
                  <span className="font-inter text-[13px] text-th-text-tertiary">
                    Amount
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[16px] font-semibold text-[#D4AF37]">
                      {formatAED(Math.round((selected.durationMinutes / 60) * 120 * 100), { decimals: 0 })}
                    </span>
                    <span className="font-inter text-[11px] text-th-text-tertiary">
                      Paid via Tabby
                    </span>
                  </div>
                </div>
                <div className="flex flex-col py-3">
                  <span className="font-inter text-[13px] text-th-text-tertiary mb-2">
                    Notes
                  </span>
                  <div className="bg-th-elevated p-3 rounded-lg border border-th-divider font-inter text-[13px] text-th-text-secondary">
                    No notes.
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <button className="w-full h-[44px] bg-th-elevated hover:bg-th-divider border border-th-border-medium text-th-text font-display text-[14px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <EnvelopeSimple size={18} /> Message Player
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  className="w-full mt-1 py-3 rounded-xl border border-[#E74C3C]/40 text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors text-sm font-medium"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-[120px] h-[120px] rounded-full border-2 border-[#D4AF37]/30 flex items-center justify-center mb-6">
                <Calendar size={48} color="#D4AF37" opacity={0.5} weight="light" />
              </div>
              <h3 className="font-display text-[16px] font-semibold text-th-text mb-2">
                Select a booking
              </h3>
              <p className="font-inter text-[13px] text-th-text-tertiary max-w-[200px]">
                Click on any booking block in the calendar to view details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--th-overlay)] backdrop-blur-sm">
          <div className="bg-th-card border border-th-divider rounded-2xl p-6 w-full max-w-[360px] shadow-[var(--th-shadow-modal)]">
            <h3 className="font-display text-[18px] font-semibold text-th-text mb-2">
              Cancel this booking?
            </h3>
            <p className="font-inter text-[14px] text-th-text-tertiary mb-6">
              Player will be notified and refunded per policy.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCancelOpen(false)}
                className="flex-1 h-[40px] border border-th-divider text-th-text hover:bg-th-divider font-inter text-[13px] font-medium rounded-lg transition-colors"
              >
                Keep booking
              </button>
              <button
                onClick={() => setIsCancelOpen(false)}
                className="flex-1 h-[40px] bg-[#E74C3C] hover:bg-[#C0392B] text-white font-inter text-[13px] font-medium rounded-lg transition-colors"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
