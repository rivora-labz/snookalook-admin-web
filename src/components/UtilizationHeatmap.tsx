"use client";

import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface UtilizationCell {
  bookedSlots: number;
  totalSlots: number;
}

export interface UtilizationGrid {
  // 7 rows (Mon–Sun) × 24 cols (00–23). Null cells = closed / no data.
  grid: (UtilizationCell | null)[][];
}

function colorFor(pct: number): string {
  if (pct < 0.2) return "#E74C3C";
  if (pct < 0.4) return "#F39C12";
  if (pct < 0.6) return "#F1C40F";
  if (pct < 0.8) return "#9CCC65";
  return "#0B3D2E";
}

export default function UtilizationHeatmap({
  data,
  loading,
}: {
  data: UtilizationGrid | null;
  loading: boolean;
}) {
  const [hover, setHover] = useState<{ day: string; hour: number; cell: UtilizationCell } | null>(
    null,
  );

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-th-text">Utilization Heatmap</h2>
        <div className="flex items-center gap-1 text-[10px] text-th-text-tertiary">
          <span>Low</span>
          <span className="inline-block h-2 w-3" style={{ backgroundColor: "#E74C3C" }} />
          <span className="inline-block h-2 w-3" style={{ backgroundColor: "#F39C12" }} />
          <span className="inline-block h-2 w-3" style={{ backgroundColor: "#F1C40F" }} />
          <span className="inline-block h-2 w-3" style={{ backgroundColor: "#9CCC65" }} />
          <span className="inline-block h-2 w-3" style={{ backgroundColor: "#0B3D2E" }} />
          <span>High</span>
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded bg-th-divider" />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center text-xs text-th-text-tertiary">
          Unable to load utilization data.
        </div>
      ) : (
        <div
          role="img"
          aria-label={(() => {
            const cells = data.grid.flat().filter((c): c is UtilizationCell => !!c);
            const totalBooked = cells.reduce((s, c) => s + c.bookedSlots, 0);
            const totalSlots = cells.reduce((s, c) => s + c.totalSlots, 0);
            const pct = totalSlots > 0 ? Math.round((totalBooked / totalSlots) * 100) : 0;
            return `Utilization heatmap across 7 days × 24 hours. Overall ${pct}% utilized (${totalBooked} of ${totalSlots} slots booked).`;
          })()}
        >
          <table className="sr-only">
            <caption>Daily utilization summary</caption>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Utilization</th></tr>
            </thead>
            <tbody>
              {DAYS.map((day, d) => {
                const row = data.grid[d] ?? [];
                const booked = row.reduce((s, c) => s + (c?.bookedSlots ?? 0), 0);
                const total = row.reduce((s, c) => s + (c?.totalSlots ?? 0), 0);
                const pct = total > 0 ? Math.round((booked / total) * 100) : 0;
                return (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>{`${pct}% (${booked} of ${total} slots)`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="overflow-x-auto">
            <table className="border-separate text-[10px]" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="px-1 text-left font-medium text-th-text-tertiary"></th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th
                      key={h}
                      className="text-center font-mono text-[9px] text-th-text-tertiary"
                      style={{ minWidth: 18 }}
                    >
                      {h % 3 === 0 ? h : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, d) => (
                  <tr key={day}>
                    <td className="pr-2 text-th-text-tertiary">{day}</td>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cell = data.grid[d]?.[h] ?? null;
                      if (!cell || cell.totalSlots === 0) {
                        return (
                          <td
                            key={h}
                            className="bg-th-divider/30"
                            style={{ width: 18, height: 18 }}
                          />
                        );
                      }
                      const pct = cell.bookedSlots / cell.totalSlots;
                      return (
                        <td
                          key={h}
                          onMouseEnter={() => setHover({ day, hour: h, cell })}
                          onMouseLeave={() => setHover(null)}
                          style={{
                            width: 18,
                            height: 18,
                            backgroundColor: colorFor(pct),
                            opacity: 0.4 + pct * 0.6,
                          }}
                          aria-label={`${day} ${h}: ${cell.bookedSlots}/${cell.totalSlots}`}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 h-5 text-xs text-th-text-tertiary">
            {hover &&
              `${hover.day} ${hover.hour.toString().padStart(2, "0")}:00 — ${hover.cell.bookedSlots}/${hover.cell.totalSlots} slots booked = ${Math.round(
                (hover.cell.bookedSlots / hover.cell.totalSlots) * 100,
              )}%`}
          </div>
        </div>
      )}
    </div>
  );
}
