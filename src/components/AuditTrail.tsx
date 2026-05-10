"use client";

import {
  type AdminAuditEntry,
  humanizeAuditAction,
  summarizeMetadata,
} from "../lib/audit-action-labels";
import { formatDateTime } from "../lib/datetime";

export type AuditState =
  | { kind: "loading" }
  | { kind: "todo"; reason: string }
  | { kind: "error"; message: string; onRetry: () => void }
  | { kind: "ready"; entries: AdminAuditEntry[] };

interface AuditTrailProps {
  state: AuditState;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export default function AuditTrail({ state, onLoadMore, loadingMore }: AuditTrailProps) {
  return (
    <div className="rounded-card border border-th-divider bg-th-card">
      <div className="border-b border-th-divider px-5 py-3">
        <h2 className="font-display text-lg text-th-text">Audit Trail</h2>
      </div>

      {state.kind === "loading" && (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
          ))}
        </div>
      )}

      {state.kind === "todo" && (
        <div className="border border-dashed border-[#F39C12]/40 bg-[#F39C12]/5 p-5 text-sm text-th-text-secondary">
          <div className="font-medium text-[#F39C12]">Audit log endpoint coming soon</div>
          <div className="mt-1">{state.reason}</div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="p-6 text-center text-sm text-[#E74C3C]">
          {state.message}
          <div className="mt-3">
            <button
              onClick={state.onRetry}
              className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {state.kind === "ready" && state.entries.length === 0 && (
        <div className="p-6 text-center text-sm text-th-text-tertiary">
          No admin actions on this booking yet.
        </div>
      )}

      {state.kind === "ready" && state.entries.length > 0 && (
        <ul className="divide-y divide-th-divider">
          {state.entries.map((entry) => {
            const meta = summarizeMetadata(entry.metadata);
            return (
              <li key={entry.id} className="px-5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm text-th-text">
                    <span className="font-medium">
                      {entry.actorDisplayName ?? "Admin"}
                    </span>{" "}
                    <span className="text-th-text-secondary">
                      {humanizeAuditAction(entry.action)}
                    </span>
                  </div>
                  <span className="text-[11px] text-th-text-tertiary">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {meta && (
                  <div className="mt-1 text-[11px] text-th-text-tertiary">{meta}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state.kind === "ready" && onLoadMore && (
        <div className="border-t border-th-divider px-5 py-3">
          {loadingMore ? (
            <div className="h-8 animate-pulse rounded bg-th-divider" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-th-text-secondary hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
            >
              Load older ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}
