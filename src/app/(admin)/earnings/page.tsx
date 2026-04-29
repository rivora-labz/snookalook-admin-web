"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, formatAED, formatDate, formatDateShort } from "../../../lib/api";
import { useTheme } from "../../../lib/ThemeContext";
import {
  AnalyticsCharts,
  type TableUtilizationItem,
  type TopPlayerItem,
  type BookingSourceItem,
} from "../../../components/AnalyticsCharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Kpis {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  avgBookingValue: number;
}

interface RevenueDayPoint {
  date: string;
  revenue: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  booking: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    table: { tableNumber: number; type: string };
    startAt: string;
  };
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  CAPTURED: "#2ECC71",
  AUTHORIZED: "#2ECC71",
  PENDING: "#F39C12",
  FAILED: "#E74C3C",
  REFUNDED: "#3498DB",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  CAPTURED: "Completed",
  AUTHORIZED: "Authorized",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="text-xs text-th-text-secondary">{label}</div>
      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-th-divider" />
      ) : (
        <div className="mt-2 font-mono text-2xl text-th-text">{value}</div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, revenue } = payload[0].payload;
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      {formatAED(revenue)} on {formatDateShort(date)}
    </div>
  );
}

export default function EarningsPage() {
  const { isDark } = useTheme();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [chartData, setChartData] = useState<RevenueDayPoint[]>([]);
  const [utilization, setUtilization] = useState<TableUtilizationItem[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayerItem[]>([]);
  const [bookingSources, setBookingSources] = useState<BookingSourceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridStroke = isDark ? "#2A2A2A" : "#E8E8E4";
  const tickFill = isDark ? "#6B6B6B" : "#999999";
  const barFill = isDark ? "#D4AF37" : "#B8961F";
  const cursorFill = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, paymentsRes] = await Promise.all([
        apiFetch<{
          kpis: Kpis;
          revenueTrend: RevenueDayPoint[];
          tableUtilization: TableUtilizationItem[];
          topPlayers: TopPlayerItem[];
          bookingSources: BookingSourceItem[];
        }>("/admin/analytics?period=30d"),
        apiFetch<{ items: PaymentItem[] }>("/admin/payments?limit=20"),
      ]);

      setKpis(analyticsRes.kpis);
      setChartData(analyticsRes.revenueTrend);
      setUtilization(analyticsRes.tableUtilization ?? []);
      setTopPlayers(analyticsRes.topPlayers ?? []);
      setBookingSources(analyticsRes.bookingSources ?? []);
      setPayments(paymentsRes.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">Earnings</h1>
        <p className="mt-1 text-th-text-secondary">Revenue, trends, and payment history</p>
      </header>

      {error && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={fetchAll}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <KpiCard label="Today's Revenue" value={kpis ? formatAED(kpis.revenueToday) : ""} loading={loading} />
        <KpiCard label="This Week" value={kpis ? formatAED(kpis.revenueWeek) : ""} loading={loading} />
        <KpiCard label="This Month" value={kpis ? formatAED(kpis.revenueMonth) : ""} loading={loading} />
        <KpiCard label="Avg Booking Value" value={kpis ? formatAED(kpis.avgBookingValue) : ""} loading={loading} />
      </div>

      {/* Revenue chart */}
      <div className="mb-8 rounded-card border border-th-divider bg-th-card p-5">
        <h2 className="mb-4 text-sm font-medium text-th-text-secondary">Revenue — Last 30 Days</h2>
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-th-divider" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
            No revenue data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatDateShort(v)}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `AED ${(v / 100).toFixed(0)}`}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
              <Bar dataKey="revenue" fill={barFill} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Analytics charts row */}
      <div className="mb-8">
        <AnalyticsCharts
          utilization={utilization}
          topPlayers={topPlayers}
          bookingSources={bookingSources}
          loading={loading}
        />
      </div>

      {/* Recent payments table */}
      <div className="rounded-card border border-th-divider bg-th-card">
        <div className="border-b border-th-divider px-5 py-3">
          <h2 className="text-sm font-medium text-th-text-secondary">Recent Payments</h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-th-text-tertiary">No payments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Player</th>
                <th className="px-5 py-2.5 font-medium">Table</th>
                <th className="px-5 py-2.5 font-medium">Method</th>
                <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-th-divider/50 last:border-b-0">
                  <td className="px-5 py-2.5 text-th-text-secondary">{formatDate(p.createdAt)}</td>
                  <td className="px-5 py-2.5 text-th-text">{p.booking.host.displayName}</td>
                  <td className="px-5 py-2.5">
                    <span className="font-mono text-th-text">#{p.booking.table.tableNumber}</span>
                    <span className="ml-1 text-th-text-tertiary">{p.booking.table.type}</span>
                  </td>
                  <td className="px-5 py-2.5 text-th-text-secondary">{p.method.replace("_", " ")}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-th-text">{formatAED(p.amount)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: PAYMENT_STATUS_COLOR[p.status] ?? "#6B6B6B", color: "#fff" }}
                    >
                      {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
