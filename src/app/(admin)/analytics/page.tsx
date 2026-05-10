"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { CaretDown, TrendUp } from "phosphor-react";
import { apiFetch, formatAED } from "../../../lib/api";
import { formatDateShort } from "../../../lib/datetime";

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
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  avgBookingValue: number;
  bookingsCount?: number;
  activePlayersCount?: number;
  utilizationPct?: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  booking: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    table: { tableNumber: number; type: string };
    startAt: string;
  };
}

const UTILIZATION_DATA = [
  { hour: "10:00", utilization: 25, isPeak: false },
  { hour: "11:00", utilization: 28, isPeak: false },
  { hour: "12:00", utilization: 36, isPeak: false },
  { hour: "13:00", utilization: 42, isPeak: false },
  { hour: "14:00", utilization: 50, isPeak: false },
  { hour: "15:00", utilization: 55, isPeak: false },
  { hour: "16:00", utilization: 60, isPeak: false },
  { hour: "17:00", utilization: 65, isPeak: false },
  { hour: "18:00", utilization: 72, isPeak: false },
  { hour: "19:00", utilization: 78, isPeak: false },
  { hour: "20:00", utilization: 90, isPeak: true },
  { hour: "21:00", utilization: 95, isPeak: true },
  { hour: "22:00", utilization: 88, isPeak: true },
  { hour: "23:00", utilization: 62, isPeak: false },
];

const SOURCE_DATA = [
  { id: "src-direct", name: "Direct", value: 45, color: "#D4AF37" },
  { id: "src-matchmaking", name: "Matchmaking", value: 32, color: "#2ECC71" },
  { id: "src-referral", name: "Referral", value: 15, color: "#3498DB" },
  { id: "src-walkin", name: "Walk-in", value: 8, color: "#808080" },
];

const PERIOD_PARAM: Record<string, string> = {
  Day: "1d",
  Week: "7d",
  Month: "30d",
  Year: "365d",
};

function periodRevenue(kpis: AnalyticsKpis, period: string): number {
  if (period === "Day") return kpis.revenueToday;
  if (period === "Week") return kpis.revenueWeek;
  return kpis.revenueMonth;
}

function buildRevenueTrend(payments: PaymentItem[]): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "CAPTURED" && p.status !== "AUTHORIZED") continue;
    const key = formatDateShort(p.createdAt);
    map.set(key, (map.get(key) ?? 0) + p.amount);
  }
  return Array.from(map.entries())
    .map(([date, fils]) => ({ date, value: Math.round(fils / 100) }))
    .slice(-20);
}

interface TopPlayer {
  id: string;
  rank: number;
  name: string;
  avatarUrl: string | null;
  matches: number;
  revFils: number;
}

function buildTopPlayers(payments: PaymentItem[]): TopPlayer[] {
  const map = new Map<string, { name: string; avatarUrl: string | null; totalFils: number; count: number }>();
  for (const p of payments) {
    if (p.status !== "CAPTURED" && p.status !== "AUTHORIZED") continue;
    const { id, displayName, avatarUrl } = p.booking.host;
    const cur = map.get(id) ?? { name: displayName, avatarUrl, totalFils: 0, count: 0 };
    cur.totalFils += p.amount;
    cur.count += 1;
    map.set(id, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].totalFils - a[1].totalFils)
    .slice(0, 5)
    .map(([id, v], i) => ({ id, rank: i + 1, name: v.name, avatarUrl: v.avatarUrl, matches: v.count, revFils: v.totalFils }));
}

export default function AnalyticsPage() {
  const [activePeriod, setActivePeriod] = useState("Month");
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const param = PERIOD_PARAM[period] ?? "30d";
      const [analyticsRes, paymentsRes] = await Promise.all([
        apiFetch<{ kpis: AnalyticsKpis }>(`/admin/analytics?period=${param}`),
        apiFetch<{ items: PaymentItem[] }>("/admin/payments?limit=100"),
      ]);
      setKpis(analyticsRes.kpis);
      setPayments(paymentsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activePeriod);
  }, [activePeriod, fetchData]);

  const revenueData = buildRevenueTrend(payments);
  const topPlayers = buildTopPlayers(payments);
  const captured = payments.filter((p) => p.status === "CAPTURED" || p.status === "AUTHORIZED");
  const totalBookings = kpis?.bookingsCount ?? captured.length;
  const activePlayers = kpis?.activePlayersCount ?? new Set(captured.map((p) => p.booking.host.id)).size;
  const totalRevenueFils = kpis ? periodRevenue(kpis, activePeriod) : 0;

  const kpiItems = [
    {
      id: "kpi-revenue",
      title: "Total Revenue",
      value: loading ? null : formatAED(totalRevenueFils),
      trend: "+18% MoM",
      trendColor: "text-[#2ECC71]",
    },
    {
      id: "kpi-bookings",
      title: "Total Bookings",
      value: loading ? null : String(totalBookings),
      trend: "+9% MoM",
      trendColor: "text-[#2ECC71]",
    },
    {
      id: "kpi-utilization",
      title: "Avg Utilization",
      value: loading ? null : (kpis?.utilizationPct != null ? `${kpis.utilizationPct}%` : "N/A"),
      trend: "+4pp MoM",
      trendColor: "text-[#D4AF37]",
    },
    {
      id: "kpi-players",
      title: "Active Players",
      value: loading ? null : String(activePlayers),
      trend: "+23% MoM",
      trendColor: "text-[#2ECC71]",
    },
  ];

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
        <div className="bg-th-card p-1 rounded-lg border border-[var(--th-border)] flex items-center">
          {["Day", "Week", "Month", "Year"].map((p) => (
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

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiItems.map((kpi) => (
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
            <div className={`font-inter text-[13px] font-medium flex items-center gap-1.5 ${kpi.trendColor}`}>
              <TrendUp size={16} weight="bold" /> {kpi.trend}
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
        ))}
      </div>

      {/* Row 2 — Charts */}
      <div className="flex gap-6">
        {/* Revenue Trend (60%) */}
        <div className="flex-[6] bg-th-card rounded-2xl p-6 border border-th-divider">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-[16px] font-semibold text-th-text">Revenue Trend</h2>
            <button className="font-inter text-[12px] text-th-text-tertiary hover:text-th-text px-2 py-1 bg-[var(--th-hover)] rounded flex items-center gap-1">
              Last 30 Days <CaretDown size={12} />
            </button>
          </div>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded bg-th-divider" />
            ) : (
              <RevenueAreaChart data={revenueData} />
            )}
          </div>
        </div>

        {/* Table Utilization by Hour (40%) */}
        <div className="flex-[4] bg-th-card rounded-2xl p-6 border border-th-divider">
          <h2 className="font-display text-[16px] font-semibold text-th-text mb-6">Table Utilization by Hour</h2>
          <div className="h-[280px] w-full">
            <UtilizationBarChart data={UTILIZATION_DATA} />
          </div>
        </div>
      </div>

      {/* Row 3 — Top Players + Booking Source */}
      <div className="flex gap-6">
        {/* Top Players */}
        <div className="flex-1 bg-th-card rounded-2xl p-6 border border-th-divider overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-[16px] font-semibold text-th-text">Top Players</h2>
            <button className="text-[#D4AF37] font-inter text-[12px] hover:underline">View All</button>
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
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider">Matches</th>
                    <th className="py-3 px-4 font-inter text-[12px] text-th-text-tertiary font-medium uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player) => (
                    <tr key={player.id} className="border-b border-th-divider/50 hover:bg-th-divider/50 transition-colors">
                      <td className="py-4 px-4 font-display text-[14px] font-semibold text-th-text-tertiary">#{player.rank}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#3498DB] flex-shrink-0">
                            <Image
                              src={player.avatarUrl ?? `https://i.pravatar.cc/100?u=${player.id}`}
                              alt={player.name}
                              width={32}
                              height={32}
                              unoptimized
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                          <span className="font-inter text-[14px] font-medium text-th-text">{player.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-inter text-[13px] text-th-text-secondary">{player.matches}</td>
                      <td className="py-4 px-4 font-mono text-[14px] font-semibold text-[#D4AF37]">{formatAED(player.revFils)}</td>
                    </tr>
                  ))}
                  {topPlayers.length === 0 && (
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
            <SourcePieChart data={SOURCE_DATA} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display text-[28px] font-bold text-th-text">
                {loading ? "—" : totalBookings}
              </span>
              <span className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider mt-1">Total Bookings</span>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            {SOURCE_DATA.map((s) => (
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
