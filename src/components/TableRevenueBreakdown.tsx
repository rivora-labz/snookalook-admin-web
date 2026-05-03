"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatAED } from "../lib/api";

export interface TableRevenueItem {
  tableId: string;
  tableNumber: number;
  type: string;
  revenueFils: number;
  bookingCount: number;
  avgBookingFils: number;
}

const PIE_COLORS = [
  "#0B3D2E",
  "#D4AF37",
  "#9CCC65",
  "#3498DB",
  "#F39C12",
  "#E74C3C",
  "#9B59B6",
  "#1ABC9C",
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TableRevenueItem;
  return (
    <div className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-xs text-th-text shadow-lg">
      <div className="font-medium">Table #{d.tableNumber} ({d.type})</div>
      <div>{formatAED(d.revenueFils)} · {d.bookingCount} bookings</div>
    </div>
  );
}

export default function TableRevenueBreakdown({
  data,
  loading,
}: {
  data: TableRevenueItem[] | null;
  loading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <h2 className="mb-3 font-display text-lg text-th-text">Per-Table Revenue</h2>
      {loading ? (
        <div className="h-64 animate-pulse rounded bg-th-divider" />
      ) : !data ? (
        <div className="flex h-64 items-center justify-center text-xs text-th-text-tertiary">
          Unable to load table revenue.
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-th-text-tertiary">
          No table revenue this period.
        </div>
      ) : (
        <div
          role="img"
          aria-label={(() => {
            const top = data[0];
            const total = data.reduce((s, d) => s + d.revenueFils, 0);
            return `Per-table revenue across ${data.length} tables totalling ${formatAED(total)}. Top: Table #${top?.tableNumber ?? ""} at ${formatAED(top?.revenueFils ?? 0)}.`;
          })()}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="revenueFils"
                nameKey="tableNumber"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length] ?? "#0B3D2E"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-th-divider text-left text-th-text-tertiary">
                  <th className="py-2 pr-2 font-medium">Table</th>
                  <th className="py-2 pr-2 font-medium text-right">Revenue</th>
                  <th className="py-2 pr-2 font-medium text-right">Bk</th>
                  <th className="py-2 font-medium text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr
                    key={d.tableId}
                    onClick={() => router.push(`/tables/${d.tableId}` as Route)}
                    className="cursor-pointer border-b border-th-divider/50 last:border-b-0 hover:bg-th-divider/20"
                  >
                    <td className="py-2 pr-2">
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] ?? "#0B3D2E" }}
                      />
                      <span className="font-mono text-th-text">#{d.tableNumber}</span>{" "}
                      <span className="text-th-text-tertiary">{d.type}</span>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-th-text">
                      {formatAED(d.revenueFils)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-th-text-secondary">
                      {d.bookingCount}
                    </td>
                    <td className="py-2 text-right font-mono text-th-text-secondary">
                      {formatAED(d.avgBookingFils)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
