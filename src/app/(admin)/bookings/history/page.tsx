"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MagnifyingGlass, DownloadSimple, ArrowsDownUp, CaretDown, CaretUp } from "phosphor-react";
import BookingsTabs from "../../../../components/BookingsTabs";
import PlayerAvatar from "../../../../components/PlayerAvatar";
import { apiFetch, formatAED } from "../../../../lib/api";
import { formatDateTime, formatDate, formatTime } from "../../../../lib/datetime";

interface HistoryBooking {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  state: string;
  totalAmount: number;
  notes: string | null;
  host: { id: string; displayName: string; phone?: string | null; avatarUrl?: string | null };
  table: { id: string; tableNumber: number; type: string } | null;
  payment: { id: string; amount: number; status: string; method: string } | null;
}

type SortKey = "startAt" | "host" | "table" | "duration" | "amount" | "state";
type SortDir = "asc" | "desc";
type StateFilter = "ALL" | "CONFIRMED" | "PENDING" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATE_OPTIONS: { value: StateFilter; label: string }[] = [
  { value: "ALL", label: "All states" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

const STATE_PILL: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CONFIRMED: { bg: "bg-[#D4AF37]/10", text: "text-[#D4AF37]", border: "border-[#D4AF37]/30", label: "Confirmed" },
  PENDING: { bg: "bg-[#3498DB]/10", text: "text-[#3498DB]", border: "border-[#3498DB]/30", label: "Pending" },
  CHECKED_IN: { bg: "bg-[#2ECC71]/10", text: "text-[#2ECC71]", border: "border-[#2ECC71]/30", label: "Checked in" },
  IN_PLAY: { bg: "bg-[#D4AF37]/10", text: "text-[#D4AF37]", border: "border-[#D4AF37]/30", label: "In play" },
  COMPLETED: { bg: "bg-[#2ECC71]/10", text: "text-[#2ECC71]", border: "border-[#2ECC71]/30", label: "Completed" },
  CANCELLED: { bg: "bg-[#6B6B6B]/10", text: "text-[#6B6B6B]", border: "border-[#6B6B6B]/30", label: "Cancelled" },
  NO_SHOW: { bg: "bg-[#E74C3C]/10", text: "text-[#E74C3C]", border: "border-[#E74C3C]/30", label: "No-show" },
};

const RANGE_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

function toISODate(d: Date): string {
  return d.toISOString();
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function BookingsHistoryPage() {
  const [bookings, setBookings] = useState<HistoryBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("startAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - rangeDays);
      const to = new Date(now);
      to.setDate(now.getDate() + 7);
      const qs = new URLSearchParams({
        from: toISODate(from),
        to: toISODate(to),
        limit: "200",
      });
      const res = await apiFetch<{ items: HistoryBooking[] }>(`/admin/bookings?${qs.toString()}`);
      setBookings(res.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter(b => {
      if (stateFilter !== "ALL" && b.state !== stateFilter) return false;
      if (q) {
        const hay = `${b.host.displayName} ${b.host.phone ?? ""} ${b.table?.tableNumber ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, search, stateFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "startAt": cmp = new Date(a.startAt).getTime() - new Date(b.startAt).getTime(); break;
        case "host": cmp = a.host.displayName.localeCompare(b.host.displayName); break;
        case "table": cmp = (a.table?.tableNumber ?? 0) - (b.table?.tableNumber ?? 0); break;
        case "duration": cmp = a.durationMinutes - b.durationMinutes; break;
        case "amount": cmp = (a.totalAmount ?? 0) - (b.totalAmount ?? 0); break;
        case "state": cmp = a.state.localeCompare(b.state); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage],
  );

  useEffect(() => { setPage(1); }, [rangeDays, search, stateFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Time", "Player", "Phone", "Table", "Duration (min)", "Amount (AED)", "Payment Method", "Payment Status", "State", "Notes"];
    const rows = sorted.map(b => [
      formatDate(b.startAt),
      formatTime(b.startAt),
      b.host.displayName,
      b.host.phone ?? "",
      b.table ? `${b.table.tableNumber} (${b.table.type})` : "",
      b.durationMinutes,
      ((b.totalAmount ?? 0) / 100).toFixed(2),
      b.payment?.method ?? "",
      b.payment?.status ?? "",
      b.state,
      b.notes ?? "",
    ].map(csvEscape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-history-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // KPIs derived from filtered window
  const totalCount = filtered.length;
  const totalRevenue = filtered.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
  const completedCount = filtered.filter(b => b.state === "COMPLETED" || b.state === "CHECKED_IN").length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowsDownUp size={12} className="opacity-40" />;
    return sortDir === "asc" ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />;
  };

  return (
    <div className="flex flex-col h-full bg-th-bg -m-8 pb-12">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-[24px] font-semibold text-th-text">Bookings</h1>
          <BookingsTabs />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || sorted.length === 0}
            className="flex items-center gap-2 h-[40px] px-4 rounded-lg bg-th-card border border-th-border text-[13px] font-medium text-th-text hover:bg-th-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <DownloadSimple size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="px-8 mb-6">
        <div className="h-[80px] bg-th-card rounded-xl border border-th-divider flex items-center divide-x divide-th-border">
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Total bookings
            </span>
            <span className="font-display text-[20px] font-bold text-th-text leading-none">
              {loading ? "..." : totalCount}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Total revenue
            </span>
            <span className="font-display text-[20px] font-bold text-th-text leading-none">
              {loading ? "..." : formatAED(totalRevenue)}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6">
            <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-medium mb-1">
              Completion rate
            </span>
            <span className="font-display text-[20px] font-bold text-th-text leading-none">
              {loading ? "..." : `${completionRate.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player, phone, table…"
            className="w-full h-[40px] pl-10 pr-4 bg-th-card border border-th-border rounded-lg text-[13px] text-th-text placeholder:text-th-text-tertiary focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as StateFilter)}
          className="h-[40px] px-3 bg-th-card border border-th-border rounded-lg text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37]/50"
        >
          {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          className="h-[40px] px-3 bg-th-card border border-th-border rounded-lg text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37]/50"
        >
          {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="ml-auto font-inter text-[12px] text-th-text-tertiary">
          {loading ? "Loading…" : `${sorted.length} of ${bookings.length} bookings`}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 flex-1 min-h-0 flex flex-col">
        <div className="bg-th-card rounded-xl border border-th-divider overflow-hidden flex-1 flex flex-col">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="font-inter text-[13px] text-[#E74C3C] mb-3">{error}</p>
              <button
                onClick={fetchHistory}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black font-semibold text-[13px] hover:bg-[#F7D774] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[56px] border-b border-th-divider/40 last:border-0 animate-pulse flex items-center gap-4 px-6">
                  <div className="h-4 w-32 bg-th-divider rounded" />
                  <div className="h-4 w-40 bg-th-divider rounded" />
                  <div className="h-4 w-20 bg-th-divider rounded ml-auto" />
                  <div className="h-4 w-20 bg-th-divider rounded" />
                  <div className="h-6 w-24 bg-th-divider rounded-full" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="font-display text-[15px] font-semibold text-th-text mb-1">No bookings found</p>
              <p className="font-inter text-[13px] text-th-text-tertiary">
                Try adjusting filters or expanding the date range.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-th-elevated border-b border-th-divider z-10">
                  <tr>
                    <Th onClick={() => handleSort("startAt")} icon={<SortIcon k="startAt" />}>Date / Time</Th>
                    <Th onClick={() => handleSort("host")} icon={<SortIcon k="host" />}>Player</Th>
                    <Th onClick={() => handleSort("table")} icon={<SortIcon k="table" />}>Table</Th>
                    <Th onClick={() => handleSort("duration")} icon={<SortIcon k="duration" />}>Duration</Th>
                    <Th onClick={() => handleSort("amount")} icon={<SortIcon k="amount" />} align="right">Amount</Th>
                    <Th>Payment</Th>
                    <Th onClick={() => handleSort("state")} icon={<SortIcon k="state" />}>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((b) => {
                    const pill = STATE_PILL[b.state] ?? STATE_PILL.PENDING!;
                    return (
                      <tr key={b.id} className="border-b border-th-divider/40 last:border-0 hover:bg-th-elevated/50 transition-colors">
                        <td className="px-6 py-3 font-inter text-[13px] text-th-text whitespace-nowrap">
                          <div className="font-medium">{formatDate(b.startAt)}</div>
                          <div className="text-[11px] text-th-text-tertiary">{formatTime(b.startAt)} – {formatTime(b.endAt)}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar url={b.host.avatarUrl ?? null} name={b.host.displayName} size={28} />
                            <div className="min-w-0">
                              <div className="font-inter text-[13px] font-medium text-th-text truncate">{b.host.displayName}</div>
                              <div className="font-inter text-[11px] text-th-text-tertiary truncate">{b.host.phone ?? "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-inter text-[13px] text-th-text whitespace-nowrap">
                          {b.table ? `T${b.table.tableNumber.toString().padStart(2, "0")} · ${b.table.type}` : "—"}
                        </td>
                        <td className="px-6 py-3 font-inter text-[13px] text-th-text-secondary whitespace-nowrap">
                          {(b.durationMinutes / 60).toFixed(1)}h
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-[13px] font-semibold text-[#D4AF37] whitespace-nowrap">
                          {formatAED(b.totalAmount ?? 0, { decimals: 0 })}
                        </td>
                        <td className="px-6 py-3 font-inter text-[12px] text-th-text-secondary whitespace-nowrap">
                          {b.payment?.method ? (
                            <div>
                              <div>{b.payment.method}</div>
                              <div className="text-[10px] text-th-text-tertiary uppercase">{b.payment.status}</div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`${pill.bg} ${pill.text} border ${pill.border} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded`}>
                            {pill.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && sorted.length > PAGE_SIZE && (
            <div className="border-t border-th-divider px-6 py-3 flex items-center justify-between bg-th-elevated/30">
              <div className="font-inter text-[12px] text-th-text-tertiary">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="h-8 px-3 rounded-md bg-th-card border border-th-border text-[12px] font-medium text-th-text hover:bg-th-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="font-inter text-[12px] text-th-text px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="h-8 px-3 rounded-md bg-th-card border border-th-border text-[12px] font-medium text-th-text hover:bg-th-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  icon,
  align = "left",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  align?: "left" | "right";
}) {
  const sortable = !!onClick;
  return (
    <th
      onClick={onClick}
      className={`px-6 py-3 font-inter text-[11px] font-semibold uppercase tracking-wider text-th-text-tertiary ${align === "right" ? "text-right" : "text-left"} ${sortable ? "cursor-pointer hover:text-th-text select-none" : ""}`}
    >
      <span className={`inline-flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {children}
        {icon}
      </span>
    </th>
  );
}
