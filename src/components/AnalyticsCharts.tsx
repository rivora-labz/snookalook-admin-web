"use client";

import { useTheme } from "../lib/ThemeContext";
import { formatAED } from "../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export interface TableUtilizationItem {
  tableId: string;
  tableNumber: number;
  type: string;
  utilization: number;
  totalBookedMinutes: number;
}

export interface TopPlayerItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalSpent: number;
  gamesPlayed: number;
}

export interface BookingSourceItem {
  matchMode: string;
  count: number;
}

interface Props {
  utilization: TableUtilizationItem[];
  topPlayers: TopPlayerItem[];
  bookingSources: BookingSourceItem[];
  loading: boolean;
}

const BRAND_GREEN = "#0B3D2E";

const SOURCE_LABEL: Record<string, string> = {
  COMPETITIVE: "Competitive",
  CASUAL: "Casual",
  PRACTICE: "Practice",
};

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-th-text-secondary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-th-text-tertiary">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function UtilizationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { tableNumber, type, utilization, totalBookedMinutes } = payload[0].payload;
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      <div className="font-mono">
        Table #{tableNumber} <span className="text-th-text-tertiary">({type})</span>
      </div>
      <div className="mt-0.5 text-th-text-secondary">
        {(utilization * 100).toFixed(0)}% utilized · {Math.round(totalBookedMinutes / 60)}h booked
      </div>
    </div>
  );
}

function PlayerTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { displayName, totalSpent, gamesPlayed } = payload[0].payload;
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      <div>{displayName}</div>
      <div className="mt-0.5 text-th-text-secondary">
        {formatAED(totalSpent)} · {gamesPlayed} games
      </div>
    </div>
  );
}

function SourceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { matchMode, count } = payload[0].payload;
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      <div>{SOURCE_LABEL[matchMode] ?? matchMode}</div>
      <div className="mt-0.5 text-th-text-secondary">{count} bookings</div>
    </div>
  );
}

export function AnalyticsCharts({ utilization, topPlayers, bookingSources, loading }: Props) {
  const { isDark } = useTheme();
  const gold = isDark ? "#D4AF37" : "#B8961F";
  const gridStroke = isDark ? "#2A2A2A" : "#E8E8E4";
  const tickFill = isDark ? "#6B6B6B" : "#999999";
  const cursorFill = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
  const mutedBar = isDark ? "#3A3A3A" : "#D4D4D0";
  const mutedAccent = isDark ? "#5A5A5A" : "#B0B0B0";

  const utilizationData = [...utilization]
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 12);

  const topPlayersData = [...topPlayers].slice(0, 8).reverse();

  const sourcesData = [...bookingSources].sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Table Utilization — gold (primary metric) */}
      <ChartCard title="Table Utilization" subtitle="Top 12 tables, last 30 days">
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-th-divider" />
        ) : utilizationData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
            No utilization data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={utilizationData}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tableNumber"
                tickFormatter={(v) => `#${v}`}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<UtilizationTooltip />} cursor={{ fill: cursorFill }} />
              <Bar dataKey="utilization" fill={gold} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Top Players — green (revenue) */}
      <ChartCard title="Top Players by Revenue" subtitle="All-time, by total spent">
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-th-divider" />
        ) : topPlayersData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
            No player data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={topPlayersData}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatAED(v, { decimals: 0 })}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<PlayerTooltip />} cursor={{ fill: cursorFill }} />
              <Bar dataKey="totalSpent" fill={BRAND_GREEN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Booking Sources — muted (context) */}
      <ChartCard title="Booking Sources" subtitle="By match mode, last 30 days">
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-th-divider" />
        ) : sourcesData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
            No source data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={sourcesData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="matchMode"
                tickFormatter={(v: string) => SOURCE_LABEL[v] ?? v}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<SourceTooltip />} cursor={{ fill: cursorFill }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sourcesData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? mutedAccent : mutedBar} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
