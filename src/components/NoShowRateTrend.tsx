"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useTheme } from "../lib/ThemeContext";
import { formatDateShort } from "../lib/datetime";

export interface NoShowWeekPoint {
  weekStart: string;
  noShowCount: number;
  totalBookings: number;
}

export default function NoShowRateTrend({
  data,
  loading,
}: {
  data: NoShowWeekPoint[] | null;
  loading: boolean;
}) {
  const { isDark } = useTheme();
  const gridStroke = isDark ? "#2A2A2A" : "#E8E8E4";
  const tickFill = isDark ? "#6B6B6B" : "#999999";

  const enriched = data
    ? data.map((p) => ({
        weekStart: p.weekStart,
        ratePct: p.totalBookings > 0 ? (p.noShowCount / p.totalBookings) * 100 : 0,
        noShowCount: p.noShowCount,
        totalBookings: p.totalBookings,
      }))
    : [];

  const latest = enriched.at(-1);
  const overBenchmark = latest ? latest.ratePct > 10 : false;

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-th-text">No-Show Rate</h2>
        {latest && (
          <span
            className="font-mono text-sm"
            style={{ color: overBenchmark ? "#E74C3C" : "#2ECC71" }}
          >
            {latest.ratePct.toFixed(1)}% this week
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-56 animate-pulse rounded bg-th-divider" />
      ) : !data ? (
        <div className="flex h-56 items-center justify-center text-xs text-th-text-tertiary">
          Unable to load no-show trend.
        </div>
      ) : enriched.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-th-text-tertiary">
          No data.
        </div>
      ) : (
        <div
          role="img"
          aria-label={`No-show rate trend across ${enriched.length} weeks: ${enriched[0]?.ratePct.toFixed(1) ?? 0}% to ${enriched.at(-1)?.ratePct.toFixed(1) ?? 0}%, target 10%.`}
        >
          <table className="sr-only">
            <caption>Weekly no-show rate</caption>
            <thead>
              <tr><th scope="col">Week</th><th scope="col">Rate</th></tr>
            </thead>
            <tbody>
              {enriched.map((p) => (
                <tr key={p.weekStart}>
                  <td>{`Week of ${p.weekStart}`}</td>
                  <td>{`${p.ratePct.toFixed(1)}% (${p.noShowCount} of ${p.totalBookings})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={enriched} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="noShowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E74C3C" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#E74C3C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                width={40}
              />
              <Tooltip
                formatter={((v: any, _n: any, p: any) => [
                  `${Number(v).toFixed(1)}% (${p.payload.noShowCount}/${p.payload.totalBookings})`,
                  "No-show rate",
                ]) as any}
                labelFormatter={((v: any) => `Week of ${v}`) as any}
              />
              <ReferenceLine
                y={10}
                stroke="#E74C3C"
                strokeDasharray="4 4"
                label={{ value: "10% benchmark", fill: "#E74C3C", fontSize: 10, position: "right" }}
              />
              <Area
                type="monotone"
                dataKey="ratePct"
                stroke="#E74C3C"
                strokeWidth={2}
                fill="url(#noShowFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 text-[11px] text-th-text-tertiary">
            Industry benchmark: 10%. Above = action needed (deposits, reminders, ban policy review).
          </div>
        </div>
      )}
    </div>
  );
}
