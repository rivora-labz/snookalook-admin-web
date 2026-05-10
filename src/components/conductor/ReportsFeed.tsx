"use client";

import { formatDateShort, formatTime } from "../../lib/datetime";

const STATUS_COLOR: Record<string, string> = {
  COMPLETE: "#2ECC71",
  DONE: "#2ECC71",
  PARTIAL: "#F39C12",
  BLOCKED: "#E74C3C",
};

export interface ReportItem {
  name: string;
  agent: string | null;
  status: string | null;
  phase: string | null;
  mtime: number;
  sizeBytes: number;
}

export default function ReportsFeed({
  items,
  onSelect,
  selected,
}: {
  items: ReportItem[];
  onSelect: (name: string) => void;
  selected: string | null;
}) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
      <ul className="divide-y divide-th-divider">
        {items.map((r) => {
          const c = r.status ? STATUS_COLOR[r.status] ?? "#6B6B6B" : "#6B6B6B";
          return (
            <li key={r.name}>
              <button
                onClick={() => onSelect(r.name)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-th-hover ${
                  selected === r.name ? "bg-th-hover" : ""
                }`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c }}
                />
                {r.agent && (
                  <span className="rounded-pill bg-th-divider px-1.5 py-0.5 font-mono text-[10px] text-th-text-secondary">
                    {r.agent}
                  </span>
                )}
                <span className="flex-1 truncate text-th-text">{r.name}</span>
                <span className="text-[10px] text-th-text-tertiary">
                  {`${formatDateShort(r.mtime)} ${formatTime(r.mtime)}`}
                </span>
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="p-4 text-center text-xs text-th-text-tertiary">No reports.</li>
        )}
      </ul>
    </div>
  );
}
