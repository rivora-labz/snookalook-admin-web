"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatAED } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";

export interface TopHourItem {
  // ISO weekday 1=Mon..7=Sun
  dayOfWeek: number;
  hour: number; // 0..23
  revenueFils: number;
  bookingCount: number;
}

const DAY_LABEL = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function labelFor(item: TopHourItem): string {
  return `${DAY_LABEL[item.dayOfWeek] ?? "?"} ${item.hour.toString().padStart(2, "0")}:00`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as TopHourItem & { label: string };
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      <div className="font-medium">{p.label}</div>
      <div>{formatAED(p.revenueFils)} · {p.bookingCount} bookings</div>
    </div>
  );
}

export default function TopHoursChart({
  data,
  loading,
}: {
  data: TopHourItem[] | null;
  loading: boolean;
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const gridStroke = isDark ? "#2A2A2A" : "#E8E8E4";
  const tickFill = isDark ? "#6B6B6B" : "#999999";
  const barFill = isDark ? "#D4AF37" : "#B8961F";

  const enriched = data
    ? data.slice(0, 10).map((d) => ({ ...d, label: labelFor(d) }))
    : [];

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <h2 className="mb-3 font-display text-lg text-th-text">Top Revenue Hours</h2>
      {loading ? (
        <div className="h-64 animate-pulse rounded bg-th-divider" />
      ) : !data ? (
        <div className="flex h-64 items-center justify-center text-xs text-th-text-tertiary">
          Unable to load top hours.
        </div>
      ) : enriched.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
          No revenue this period.
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Top ${enriched.length} revenue hours. Highest: ${enriched[0]?.label ?? ""} at ${formatAED(enriched[0]?.revenueFils ?? 0)} across ${enriched[0]?.bookingCount ?? 0} bookings.`}
        >
          <table className="sr-only">
            <caption>Top revenue hours</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Revenue and bookings</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((p) => (
                <tr key={`${p.dayOfWeek}-${p.hour}`}>
                  <td>{p.label}</td>
                  <td>{`${formatAED(p.revenueFils)} across ${p.bookingCount} bookings`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={enriched} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickFill, fontSize: 10 }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickFormatter={(v: number) => `AED ${(v / 100).toFixed(0)}`}
              tick={{ fill: tickFill, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
            <Bar
              dataKey="revenueFils"
              fill={barFill}
              radius={[4, 4, 0, 0]}
              onClick={(p: any) => {
                const item = p?.payload as TopHourItem | undefined;
                if (!item) return;
                const qs = new URLSearchParams({
                  dayOfWeek: String(item.dayOfWeek),
                  hour: String(item.hour),
                });
                router.push(`/bookings?${qs.toString()}` as Route);
              }}
              style={{ cursor: "pointer" }}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
