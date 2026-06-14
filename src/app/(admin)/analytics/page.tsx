"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { TrendUp, TrendDown, DownloadSimple } from "phosphor-react";
import { apiFetch, formatAED } from "../../../lib/api";
import PlayerAvatar from "../../../components/PlayerAvatar";

const RevenueAreaChart = dynamic(() => import("../../../components/charts/RevenueAreaChart"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse rounded bg-th-divider" />,
});
const UtilizationBarChart = dynamic(() => import("../../../components/charts/UtilizationBarChart"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse rounded bg-th-divider" />,
});
const SourcePieChart = dynamic(() => import("../../../components/charts/SourcePieChart"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse rounded-full bg-th-divider" />,
});
const SparklineArea = dynamic(() => import("../../../components/charts/SparklineArea"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});

interface AnalyticsKpis {
  revenue: number;
  tablesInUse: number;
  activeBookings: number;
  newPlayers: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  avgBookingValue: number;
  completionRate: number;
  cancellationRate: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  revenueDeltaPct?: number;
  newPlayersDeltaPct?: number;
  totalBookingsDeltaPct?: number;
  avgBookingValueDeltaPct?: number;
  completionRateDeltaPct?: number;
  cancellationRateDeltaPct?: number;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

interface TableUtilizationItem {
  tableId: string;
  tableNumber: number;
  type: string;
  utilization: number;
  totalBookedMinutes: number;
}

interface TopPlayerItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalSpent: number;
  gamesPlayed: number;
}

interface BookingSourceItem {
  source: string;
  count: number;
}

interface AnalyticsResponse {
  period: string;
  kpis: AnalyticsKpis;
  revenueTrend: RevenueTrendPoint[];
  tableUtilization: TableUtilizationItem[];
  topPlayers: TopPlayerItem[];
  bookingSources: BookingSourceItem[];
}

type PeriodLabel = "Day" | "Week" | "Month" | "Year";

const PERIOD_PARAM: Record<PeriodLabel, "7d" | "30d" | "90d" | "1y"> = {
  Day: "7d",
  Week: "7d",
  Month: "30d",
  Year: "1y",
};

const PERIOD_DELTA_LABEL: Record<PeriodLabel, string> = {
  Day: "WoW",
  Week: "WoW",
  Month: "MoM",
  Year: "YoY",
};

const SOURCE_COLOR: Record<string, string> = {
  QUICKPLAY: "#D4AF37",
  PRIVATE: "#2ECC71",
  TOURNAMENT: "#3498DB",
  REMATCH: "#9B59B6",
  WALKIN: "#808080",
};

function sourceColor(source: string | null | undefined): string {
  if (!source) return "#808080";
  return SOURCE_COLOR[source.toUpperCase()] ?? "#808080";
}

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "Unknown";
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

function formatDelta(pct: number | undefined): { text: string; isUp: boolean } | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const sign = pct >= 0 ? "+" : "";
  const display = (pct * 100).toFixed(1).replace(/\.0$/, "");
  return { text: `${sign}${display}%`, isUp: pct >= 0 };
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AnalyticsPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodLabel>("Month");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (period: PeriodLabel) => {
    setLoading(true);
    setError(null);
    try {
      const param = PERIOD_PARAM[period];
      const res = await apiFetch<AnalyticsResponse>(
        `/admin/analytics?period=${param}&comparePrev=true`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activePeriod);
  }, [activePeriod, fetchData]);

  const kpis = data?.kpis;
  const revenueData = (data?.revenueTrend ?? []).map((p) => ({
    date: p.date.slice(5),
    value: Math.round(p.revenue / 100),
  }));
  const utilizationData = (data?.tableUtilization ?? []).map((t) => ({
    hour: `T${t.tableNumber}`,
    utilization: Math.round(t.utilization * 100),
    isPeak: t.utilization >= 0.7,
  }));
  const sourceData = (data?.bookingSources ?? []).map((s) => ({
    id: `src-${s.source}`,
    name: sourceLabel(s.source),
    value: s.count,
    color: sourceColor(s.source),
  }));
  const totalSources = sourceData.reduce((sum, s) => sum + s.value, 0);
  const deltaLabel = PERIOD_DELTA_LABEL[activePeriod];

  const kpiItems = [
    {
      id: "kpi-revenue",
      title: "Total Revenue",
      value: loading || !kpis ? null : formatAED(kpis.revenue),
      delta: formatDelta(kpis?.revenueDeltaPct),
    },
    {
      id: "kpi-bookings",
      title: "Total Bookings",
      value: loading || !kpis ? null : String(kpis.totalBookings),
      delta: formatDelta(kpis?.totalBookingsDeltaPct),
    },
    {
      id: "kpi-avg",
      title: "Avg Booking Value",
      value: loading || !kpis ? null : formatAED(kpis.avgBookingValue),
      delta: formatDelta(kpis?.avgBookingValueDeltaPct),
    },
    {
      id: "kpi-new-players",
      title: "New Players",
      value: loading || !kpis ? null : String(kpis.newPlayers),
      delta: formatDelta(kpis?.newPlayersDeltaPct),
    },
  ];

  const handleExportCSV = () => {
    if (!data) return;
    const { kpis, revenueTrend, topPlayers, tableUtilization, bookingSources } = data;
    const lines: string[] = [];

    lines.push("# KPI Summary");
    lines.push(`Period,${activePeriod}`);
    lines.push(`Total Revenue (AED),${(kpis.revenue / 100).toFixed(2)}`);
    lines.push(`Total Bookings,${kpis.totalBookings}`);
    lines.push(`Avg Booking Value (AED),${(kpis.avgBookingValue / 100).toFixed(2)}`);
    lines.push(`New Players,${kpis.newPlayers}`);
    lines.push(`Completion Rate,${(kpis.completionRate * 100).toFixed(1)}%`);
    lines.push(`Cancellation Rate,${(kpis.cancellationRate * 100).toFixed(1)}%`);
    lines.push("");

    lines.push("# Revenue Trend");
    lines.push("Date,Revenue (AED)");
    for (const p of revenueTrend) {
      lines.push(`${p.date},${(p.revenue / 100).toFixed(2)}`);
    }
    lines.push("");

    lines.push("# Top Players");
    lines.push("Rank,Player,Games Played,Total Spent (AED)");
    topPlayers.forEach((p, i) => {
      lines.push(`${i + 1},${csvEscape(p.displayName)},${p.gamesPlayed},${(p.totalSpent / 100).toFixed(2)}`);
    });
    lines.push("");

    lines.push("# Table Utilization");
    lines.push("Table,Type,Utilization %,Booked Minutes");
    for (const t of tableUtilization) {
      lines.push(`T${t.tableNumber},${csvEscape(t.type)},${(t.utilization * 100).toFixed(1)},${t.totalBookedMinutes}`);
    }
    lines.push("");

    lines.push("# Booking Sources");
    lines.push("Source,Count");
    for (const s of bookingSources) {
      lines.push(`${csvEscape(sourceLabel(s.source))},${s.count}`);
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${activePeriod.toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="font-inter text-[14px] text-[#E74C3C]">{error}</p>
        <button
          onClick={() => fetchData(activePeriod)}
          className="rounded-lg bg-[#D4AF37] px-4 py-2 font-inter text-[13px] font-semibold text-black hover:bg-[#E8C654] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] font-semibold text-th-text">Analytics</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || !data}
            className="flex items-center gap-2 h-[36px] px-4 rounded-lg bg-th-card border border-th-border text-[13px] font-medium text-th-text hover:bg-th-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <DownloadSimple size={15} />
            Export CSV
          </button>
          <div className="bg-th-card p-1 rounded-lg border border-[var(--th-border)] flex items-center">
            {(["Day", "Week", "Month", "Year"] as PeriodLabel[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  activePeriod === p
                    ? "bg-th-divider text-th-text shadow-sm"
                    : "text-th-text-tertiary hover:text-th-text hover:bg-[var(--th-hover)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiItems.map((kpi) => {
          const deltaColor = kpi.delta == null
            ? "text-th-text-tertiary"
            : kpi.delta.isUp
              ? "text-[#2ECC71]"
              : "text-[#E74C3C]";
          return (
            <div
              key={kpi.id}
              className="bg-th-card rounded-2xl p-6 border border-th-divider hover:border-[var(--th-border-medium)] transition-colors relative overflow-hidden group"
            >
              <span className="font-inter text-[13px] text-th-text-secondary block mb-3">{kpi.title}</span>
              <div className="font-display text-[32px] font-bold text-th-text leading-none mb-3">
                {kpi.value == null ? (
                  <div className="h-8 w-28 animate-pulse rounded bg-th-divider" />
                ) : (
                  kpi.value
                )}
              </div>
              <div className={`font-inter text-[13px] font-medium flex items-center gap-1.5 ${deltaColor}`}>
                {kpi.delta == null ? (
                  <span>—</span>
                ) : (
                  <>
                    {kpi.delta.isUp ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
                    {kpi.delta.text} {deltaLabel}
                  </>
                )}
              </div>
              {revenueData.length > 0 && (
                <div className="absolute bottom-[-10px] right-[-10px] w-[120px] h-[60px] opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
                  <SparklineArea
                    data={revenueData.slice(-7).map((d, i) => ({ i, val: d.value }))}
                    dataKey="val"
                    stroke="#D4AF37"
                    fillId={`kpi-spark-${kpi.id}`}
                    height={60}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2 — Charts */}
      <div className="flex gap-6">
        {/* Revenue Trend (60%) */}
        <div className="flex-[6] bg-th-card rounded-2xl p-6 border border-th-divider">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-[16px] font-semibold text-th-text">Revenue Trend</h2>
            <span className="font-inter text-[12px] text-th-text-tertiary">{activePeriod}</span>
          </div>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded bg-th-divider" />
            ) : revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-inter text-[13px] text-th-text-tertiary">No revenue yet.</div>
            ) : (
              <RevenueAreaChart data={revenueData} />
            )}
          </div>
        </div>

        {/* Table Utilization (40%) */}
        <div className="flex-[4] bg-th-card rounded-2xl p-6 border border-th-divider">
          <h2 className="font-display text-[16px] font-semibold text-th-text mb-6">Table Utilization</h2>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded bg-th-divider" />
            ) : utilizationData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-inter text-[13px] text-th-text-tertiary">No tables.</div>
            ) : (
              <UtilizationBarChart data={utilizationData} />
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — Top Players + Booking Source */}
      <div className="flex gap-6">
        {/* Top Players */}
        <div className="flex-1 bg-th-card rounded-2xl p-6 border border-th-divider overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-[16px] font-semibold text-th-text">Top Players</h2>
          </div>
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-th-divider">
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider w-[60px]">Rank</th>
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider">Player</th>
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider">Games</th>
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topPlayers ?? []).slice(0, 5).map((player, i) => (
                    <tr key={player.userId} className="border-b border-th-divider/50 hover:bg-th-divider/50 transition-colors">
                      <td className="py-4 px-4 font-display text-[14px] font-semibold text-th-text-tertiary">#{i + 1}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar
                            url={player.avatarUrl ?? null}
                            name={player.displayName}
                            size={32}
                            className="border border-[#3498DB]"
                          />
                          <span className="font-inter text-[14px] font-medium text-th-text">{player.displayName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-inter text-[13px] text-th-text-secondary">{player.gamesPlayed}</td>
                      <td className="py-4 px-4 font-mono text-[14px] font-semibold text-[#D4AF37]">{formatAED(player.totalSpent)}</td>
                    </tr>
                  ))}
                  {(data?.topPlayers ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center font-inter text-[13px] text-th-text-tertiary">No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Booking Source Donut */}
        <div className="flex-1 bg-th-card rounded-2xl p-6 border border-th-divider flex flex-col items-center justify-center relative">
          <h2 className="font-display text-[16px] font-semibold text-th-text absolute top-6 left-6">Booking Source</h2>
          <div className="w-[280px] h-[280px] relative mt-4">
            {sourceData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center font-inter text-[13px] text-th-text-tertiary">No bookings.</div>
            ) : (
              <>
                <SourcePieChart data={sourceData} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-[28px] font-bold text-th-text">
                    {loading ? "—" : totalSources}
                  </span>
                  <span className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider mt-1">Total Bookings</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-6 mt-4 flex-wrap justify-center">
            {sourceData.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="font-inter text-[13px] text-th-text-secondary">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
