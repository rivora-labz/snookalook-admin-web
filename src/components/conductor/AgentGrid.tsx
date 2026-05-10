"use client";

import { useState } from "react";
import { formatDateShort, formatTime } from "../../lib/datetime";

const STATUS_COLOR: Record<string, string> = {
  COMPLETE: "#2ECC71",
  DONE: "#2ECC71",
  PARTIAL: "#F39C12",
  BLOCKED: "#E74C3C",
};

export interface AgentCardData {
  agent: string;
  lastReportName: string | null;
  lastReportMtime: number | null;
  lastReportStatus: string | null;
  inboxPending: boolean;
}

export default function AgentGrid({
  agents,
  onSpawn,
  onCompose,
}: {
  agents: AgentCardData[];
  onSpawn: (agent: string) => Promise<void>;
  onCompose: (agent: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {agents.map((a) => {
        const color = a.lastReportStatus ? STATUS_COLOR[a.lastReportStatus] ?? "#6B6B6B" : "#6B6B6B";
        return (
          <div
            key={a.agent}
            className="rounded-card border border-th-divider bg-th-card p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-sm font-medium text-th-text">{a.agent}</div>
              {a.inboxPending && (
                <span className="rounded-pill bg-[#F39C12] px-1.5 text-[10px] font-medium text-black">
                  inbox
                </span>
              )}
            </div>
            <div className="mb-3 flex items-center gap-1.5 text-[11px]">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-th-text-secondary">
                {a.lastReportStatus ?? "no report"}
              </span>
              {a.lastReportMtime && (
                <span className="text-th-text-tertiary">
                  · {`${formatDateShort(a.lastReportMtime)} ${formatTime(a.lastReportMtime)}`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy === a.agent}
                onClick={async () => {
                  setBusy(a.agent);
                  try {
                    await onSpawn(a.agent);
                  } finally {
                    setBusy(null);
                  }
                }}
                className="flex-1 rounded-button bg-th-gold px-2 py-1 text-[11px] font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
              >
                {busy === a.agent ? "…" : "Spawn"}
              </button>
              <button
                onClick={() => onCompose(a.agent)}
                className="flex-1 rounded-button border border-th-divider px-2 py-1 text-[11px] text-th-text hover:bg-th-hover"
              >
                Brief
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
