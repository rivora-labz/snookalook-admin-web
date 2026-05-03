"use client";

import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, useEffect } from "react";
import { formatAED, formatDate } from "../../../../lib/api";
import { STATUS_TOKEN } from "../../../../lib/status-tokens";
import { useStaffSession } from "../../../../lib/use-staff-session";
import ResolveDisputeModal, { type DisputeRecord } from "../../../../components/ResolveDisputeModal";
import { apiFetch, ApiError } from "../../../../lib/api";

// ─── Types (forward-declared pending endpoint) ───────────────────────────────

interface AdminMatchPlayerSide {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ratingBefore: number;
  ratingAfter: number;
  tierBefore: string;
  tierAfter: string;
}

interface AdminMatchLoserPays {
  id: string;
  status: "PENDING" | "SETTLED" | "DISPUTED" | "FAILED";
  amountFils: number;
  providerReference: string | null;
}

interface AdminMatchDispute {
  id: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  reason: string;
  openedBy: { id: string; displayName: string };
  openedAt: string;
  resolvedAt: string | null;
  outcome: string | null;
  adminNote: string | null;
  claimType: string | null;
  hostUserId: string;
  opponentUserId: string | null;
  bookingTotalAmount: number;
  bookingStartAt: string;
}

/** Full match drilldown shape. Awaiting backend endpoint. */
export interface AdminMatchDetail {
  id: string;
  bookingId: string;
  matchMode: string;
  playedAt: string;
  winner: AdminMatchPlayerSide | null;
  loser: AdminMatchPlayerSide | null;
  table: {
    id: string;
    tableNumber: number;
    type: string;
    center: { id: string; name: string };
  } | null;
  loserPaysSettlement: AdminMatchLoserPays | null;
  dispute: AdminMatchDispute | null;
  booking: { id: string; state: string } | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EloDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const sign = delta >= 0 ? "+" : "";
  const color = delta >= 0 ? STATUS_TOKEN.SUCCESS : STATUS_TOKEN.FAILURE;
  return (
    <span className="font-mono text-xs font-medium" style={{ color }}>
      {sign}{delta} ({after})
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-block rounded-pill border border-th-divider bg-th-bg px-2 py-0.5 text-[10px] font-medium text-th-text-secondary">
      {tier}
    </span>
  );
}

const SETTLE_STATUS_COLOR: Record<string, string> = {
  SETTLED: STATUS_TOKEN.SUCCESS,
  PENDING: STATUS_TOKEN.WARNING,
  DISPUTED: STATUS_TOKEN.FAILURE,
  FAILED: STATUS_TOKEN.FAILURE,
};

const DISPUTE_STATUS_COLOR: Record<string, string> = {
  OPEN: STATUS_TOKEN.WARNING,
  RESOLVED: STATUS_TOKEN.SUCCESS,
  REJECTED: STATUS_TOKEN.NEUTRAL,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = params?.id ?? "";

  const { session } = useStaffSession();
  const canMutate = session?.role !== "STAFF";

  const [match, setMatch] = useState<AdminMatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resolveTarget, setResolveTarget] = useState<DisputeRecord | null>(null);

  useEffect(() => {
    if (!matchId) return;

    async function fetchMatch() {
      try {
        setLoading(true);
        const data = await apiFetch<AdminMatchDetail>(`/admin/matches/${matchId}`);
        setMatch(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch match:", err);
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [matchId]);

  function buildDisputeRecord(d: AdminMatchDispute): DisputeRecord {
    return {
      id: d.id,
      bookingId: match?.bookingId ?? "",
      reason: d.reason,
      openedAt: d.openedAt,
      openedBy: d.openedBy,
      hostUserId: d.hostUserId,
      opponentUserId: d.opponentUserId,
      stakeFils: d.bookingTotalAmount,
      startAt: d.bookingStartAt,
    };
  }

  return (
    <div>
      <header className="mb-6">
        <button
          onClick={() => router.push("/disputes" as Route)}
          className="mb-2 text-sm text-th-text-tertiary hover:text-th-text"
        >
          ← Back to Disputes
        </button>
        <h1 className="font-display text-3xl text-th-text">Match Detail</h1>
        {matchId && (
          <p className="mt-1 font-mono text-sm text-th-text-tertiary">#{matchId.slice(0, 8)}</p>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-card border border-th-failure/50 bg-th-failure/5 p-5">
          <div className="font-medium text-th-failure">Error loading match</div>
          <div className="mt-1 text-sm text-th-text-secondary">{error}</div>
        </div>
      )}

      {/* ── Section 1: Match Header ─────────────────────────────────────────── */}
      {match ? (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
          <div className="flex flex-wrap items-start gap-6">
            {/* Winner */}
            {match.winner && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-th-gold text-lg font-bold text-black">
                  {match.winner.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm font-medium text-th-text">
                    <span>👑</span>
                    <span>{match.winner.displayName}</span>
                  </div>
                  <EloDelta before={match.winner.ratingBefore} after={match.winner.ratingAfter} />
                </div>
                {match.winner.tierBefore !== match.winner.tierAfter && (
                  <div className="flex items-center gap-1">
                    <TierBadge tier={match.winner.tierBefore} />
                    <span className="text-[10px] text-th-text-tertiary">→</span>
                    <TierBadge tier={match.winner.tierAfter} />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-th-text-tertiary">vs</span>
              <span className="mt-1 inline-block rounded-pill border border-th-divider bg-th-bg px-2 py-0.5 text-[10px] text-th-text-secondary">
                {match.matchMode.replace(/_/g, " ")}
              </span>
            </div>

            {/* Loser */}
            {match.loser && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-th-divider bg-th-bg text-lg font-bold text-th-text-secondary">
                  {match.loser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <div className="text-sm text-th-text">{match.loser.displayName}</div>
                  <EloDelta before={match.loser.ratingBefore} after={match.loser.ratingAfter} />
                </div>
                {match.loser.tierBefore !== match.loser.tierAfter && (
                  <div className="flex items-center gap-1">
                    <TierBadge tier={match.loser.tierBefore} />
                    <span className="text-[10px] text-th-text-tertiary">→</span>
                    <TierBadge tier={match.loser.tierAfter} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-th-text-tertiary">Date</div>
              <div className="text-th-text">{formatDate(match.playedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-th-text-tertiary">Club</div>
              <div className="text-th-text">{match.table?.center?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-th-text-tertiary">Table</div>
              <div className="text-th-text">
                {match.table ? (
                  <>
                    <span className="font-mono">#{match.table.tableNumber}</span>{" "}
                    <span className="text-th-text-tertiary">{match.table.type}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 h-40 animate-pulse rounded-card bg-th-card" />
      )}

      {/* ── Section 2: Loser Pays Panel ─────────────────────────────────────── */}
      {match?.loserPaysSettlement ? (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card">
          <div className="border-b border-th-divider px-5 py-3">
            <h2 className="font-display text-lg text-th-text">Loser Pays Settlement</h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium text-white"
                style={{
                  backgroundColor:
                    SETTLE_STATUS_COLOR[match.loserPaysSettlement.status] ?? "#6B6B6B",
                }}
              >
                {match.loserPaysSettlement.status}
              </span>
              <span className="font-mono text-2xl text-th-text">
                {formatAED(match.loserPaysSettlement.amountFils)}
              </span>
            </div>
            {match.loserPaysSettlement.providerReference && (
              <div className="mt-2 font-mono text-xs text-th-text-tertiary">
                Ref: {match.loserPaysSettlement.providerReference}
              </div>
            )}
          </div>
        </div>
      ) : match ? null : (
        <div className="mb-6 h-24 animate-pulse rounded-card bg-th-card" />
      )}

      {/* ── Section 3: Dispute Panel ─────────────────────────────────────────── */}
      {match?.dispute ? (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card">
          <div className="border-b border-th-divider px-5 py-3">
            <h2 className="font-display text-lg text-th-text">Dispute</h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium text-white"
                style={{
                  backgroundColor: DISPUTE_STATUS_COLOR[match.dispute.status] ?? "#6B6B6B",
                }}
              >
                {match.dispute.status}
              </span>
              <span className="text-sm text-th-text-secondary">
                Reported by {match.dispute.openedBy.displayName}
              </span>
            </div>

            <p className="mt-3 rounded-button border border-th-divider bg-th-bg p-3 text-sm text-th-text">
              {match.dispute.reason || <span className="text-th-text-tertiary">No reason provided.</span>}
            </p>

            {match.dispute.status !== "OPEN" && match.dispute.outcome && (
              <div className="mt-3">
                <div className="text-xs text-th-text-tertiary">Outcome</div>
                <div className="mt-0.5 text-sm text-th-text">{match.dispute.outcome}</div>
                {match.dispute.adminNote && (
                  <p className="mt-1 text-xs text-th-text-secondary">{match.dispute.adminNote}</p>
                )}
              </div>
            )}

            {match.dispute.status === "OPEN" && canMutate && (
              <button
                onClick={() => setResolveTarget(buildDisputeRecord(match.dispute!))}
                className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
              >
                Resolve Dispute
              </button>
            )}
          </div>
        </div>
      ) : match ? null : (
        <div className="mb-6 h-32 animate-pulse rounded-card bg-th-card" />
      )}

      {/* ── Section 4: Booking Context ──────────────────────────────────────── */}
      {match?.booking ? (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-5">
          <h2 className="mb-3 font-display text-lg text-th-text">Booking</h2>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-th-text-tertiary">Status</div>
              <div className="mt-0.5 text-sm text-th-text">{match.booking.state}</div>
            </div>
            <button
              onClick={() => router.push(`/bookings/${match.booking!.id}` as Route)}
              className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:text-th-text"
            >
              View Booking →
            </button>
          </div>
        </div>
      ) : match ? null : (
        <div className="mb-6 h-20 animate-pulse rounded-card bg-th-card" />
      )}

      {/* ── Section 5: Audit Trail ───────────────────────────────────────────── */}
      {/* Omitted: GET /v1/admin/audit-log?entityId= not yet confirmed present. */}

      <ResolveDisputeModal
        open={resolveTarget !== null}
        dispute={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={() => setResolveTarget(null)}
      />
    </div>
  );
}
