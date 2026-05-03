"use client";

import type { ReactNode } from "react";

export type RiskBucket = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface RiskBreakdown {
  riskScore: number | null | undefined;
  noShowCount: number | null | undefined;
  disputeCount: number | null | undefined;
  lateCancelCount: number | null | undefined;
}

const BUCKET_BG: Record<RiskBucket, string> = {
  NONE: "bg-[#6B6B6B]/15 text-th-text-secondary",
  LOW: "bg-[#2ECC71]/15 text-[#2ECC71]",
  MEDIUM: "bg-[#F39C12]/15 text-[#F39C12]",
  HIGH: "bg-[#E74C3C]/15 text-[#E74C3C]",
};

export function bucketFromScore(score: number | null | undefined): RiskBucket | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score < 20) return "NONE";
  if (score < 50) return "LOW";
  if (score < 80) return "MEDIUM";
  return "HIGH";
}

interface Props {
  bucket: RiskBucket | null;
  data: RiskBreakdown;
}

function fmt(n: number | null | undefined): ReactNode {
  return n != null && Number.isFinite(n) ? n : <span className="text-th-text-tertiary">—</span>;
}

export default function RiskTooltip({ bucket, data }: Props) {
  if (bucket === null) {
    return <span className="text-th-text-tertiary">—</span>;
  }
  return (
    <span className="group relative inline-block">
      <span className={`inline-block rounded-pill px-2 py-0.5 text-xs font-medium ${BUCKET_BG[bucket]}`}>
        {bucket}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-48 -translate-x-1/2 rounded-button border border-th-divider bg-th-elevated p-3 text-xs text-th-text-secondary shadow-lg group-hover:block"
      >
        <span className="mb-1.5 block text-[10px] uppercase tracking-wide text-th-text-tertiary">
          Risk breakdown
        </span>
        <span className="flex justify-between">
          <span>Score</span>
          <span className="font-mono text-th-text">{fmt(data.riskScore)}</span>
        </span>
        <span className="flex justify-between">
          <span>No-shows</span>
          <span className="font-mono text-th-text">{fmt(data.noShowCount)}</span>
        </span>
        <span className="flex justify-between">
          <span>Disputes</span>
          <span className="font-mono text-th-text">{fmt(data.disputeCount)}</span>
        </span>
        <span className="flex justify-between">
          <span>Late cancels</span>
          <span className="font-mono text-th-text">{fmt(data.lateCancelCount)}</span>
        </span>
      </span>
    </span>
  );
}
