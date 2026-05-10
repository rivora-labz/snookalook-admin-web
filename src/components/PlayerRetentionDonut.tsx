"use client";

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../lib/ThemeContext";
import { formatDateShort } from "../lib/datetime";

export interface RetentionWeekPoint {
  weekStart: string; // ISO date
  newPlayers: number;
  repeatPlayers: number;
}

export interface RetentionData {
  current: { newPlayers: number; repeatPlayers: number };
  trend: RetentionWeekPoint[]; // last 8 weeks
}

const COLORS = { repeat: "#0B3D2E", new: "#D4AF37" };

export default function PlayerRetentionDonut({
  data,
  loading,
}: {
  data: RetentionData | null;
  loading: boolean;
}) {
  const { isDark } = useTheme();
  const gridStroke = isDark ? "#2A2A2A" : "#E8E8E4";
  const tickFill = isDark ? "#6B6B6B" : "#999999";

  const total = data ? data.current.newPlayers + data.current.repeatPlayers : 0;
  const retentionPct =
    total > 0 ? Math.round((data!.current.repeatPlayers / total) * 100) : 0;

  const donutData = data
    ? [
        { name: "Repeat", value: data.current.repeatPlayers, color: COLORS.repeat },
        { name: "New", value: data.current.newPlayers, color: COLORS.new },
      ]
    : [];

  const trendData = data
    ? data.trend.map((p) => {
        const t = p.newPlayers + p.repeatPlayers;
        return {
          weekStart: p.weekStart,
          retentionPct: t > 0 ? (p.repeatPlayers / t) * 100 : 0,
        };
      })
    : [];

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <h2 className="mb-3 font-display text-lg text-th-text">Player Retention</h2>
      {loading ? (
        <div className="h-64 animate-pulse rounded bg-th-divider" />
      ) : !data ? (
        <div className="flex h-64 items-center justify-center text-xs text-th-text-tertiary">
          Unable to load retention data.
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Player retention: ${retentionPct}% repeat (${data.current.repeatPlayers} repeat, ${data.current.newPlayers} new). Trend across ${trendData.length} weeks: ${trendData[0]?.retentionPct.toFixed(0) ?? 0}% to ${trendData.at(-1)?.retentionPct.toFixed(0) ?? 0}%.`}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <table className="sr-only">
            <caption>Retention by cohort</caption>
            <thead>
              <tr><th scope="col">Cohort</th><th scope="col">Players</th></tr>
            </thead>
            <tbody>
              <tr><td>Repeat</td><td>{data.current.repeatPlayers}</td></tr>
              <tr><td>New</td><td>{data.current.newPlayers}</td></tr>
              {trendData.map((p) => (
                <tr key={p.weekStart}>
                  <td>{`Week of ${p.weekStart}`}</td>
                  <td>{`${p.retentionPct.toFixed(0)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-3xl text-th-text">{retentionPct}%</div>
              <div className="text-[10px] uppercase tracking-wide text-th-text-tertiary">
                Retention
              </div>
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-th-text-secondary">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.repeat }} />
                Repeat ({data.current.repeatPlayers})
              </span>
              <span className="flex items-center gap-1 text-th-text-secondary">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.new }} />
                New ({data.current.newPlayers})
              </span>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-th-text-secondary">Last 8 weeks</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="weekStart"
                  tick={{ fill: tickFill, fontSize: 10 }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  tickFormatter={(v: string) => formatDateShort(v)}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  tick={{ fill: tickFill, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  width={40}
                />
                <Tooltip
                  formatter={((v: any) => `${Number(v).toFixed(0)}%`) as any}
                  labelFormatter={((v: any) => `Week of ${v}`) as any}
                />
                <Line
                  type="monotone"
                  dataKey="retentionPct"
                  stroke={COLORS.repeat}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.repeat }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
