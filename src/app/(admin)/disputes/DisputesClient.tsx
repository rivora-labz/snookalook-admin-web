"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { apiFetch, ApiError, formatAED } from "../../../lib/api";
import { formatDateShort, formatTime } from "../../../lib/datetime";
import { STATUS_TOKEN, STATUS_TOKEN_TEXT } from "../../../lib/status-tokens";
import { useStaffSession } from "../../../lib/use-staff-session";
import ResolveDisputeModal, { type DisputeRecord } from "../../../components/ResolveDisputeModal";

interface DisputeApiItem {
  id: string;
  bookingId: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  reason: string;
  claimType: string | null;
  openedAt: string;
  openedBy: { id: string; displayName: string };
  booking: {
    id: string;
    hostUserId: string;
    opponentUserId: string | null;
    startAt: string;
    totalAmount: number;
  };
}

interface ListResponse {
  items: DisputeApiItem[];
  total: number;
}

type Filter = "ALL" | "OPEN" | "RESOLVED";

const FILTERS: Filter[] = ["ALL", "OPEN", "RESOLVED"];

const STATUS_DOT: Record<DisputeApiItem["status"], string> = {
  OPEN: STATUS_TOKEN.WARNING,
  RESOLVED: STATUS_TOKEN.SUCCESS,
  REJECTED: STATUS_TOKEN.NEUTRAL,
};

// Free-form claimType from backend (Prisma `claimType String?`).
// Known values: "WIN_REPORTED" (INFO=purple, claim-flow neutral, distinct from Floor ACTIVE),
// "RESULT_DISPUTED" (WARNING=amber). Anything else falls through to neutral pill.
const CLAIM_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  WIN_REPORTED: { bg: STATUS_TOKEN.INFO, text: STATUS_TOKEN_TEXT.INFO },
  RESULT_DISPUTED: { bg: STATUS_TOKEN.WARNING, text: STATUS_TOKEN_TEXT.WARNING },
};

function ClaimTypePill({ value }: { value: string | null }) {
  if (!value) return <span className="text-th-text-tertiary">—</span>;
  const style = CLAIM_TYPE_STYLE[value];
  if (style) {
    return (
      <span
        className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {value.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-pill border border-th-divider bg-th-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-th-text-secondary">
      {value.replace(/_/g, " ")}
    </span>
  );
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDateTime(iso: string): string {
  return `${formatDateShort(iso)} ${formatTime(iso)}`;
}

export default function DisputesClient() {
  const [items, setItems] = useState<DisputeApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointGap, setEndpointGap] = useState(false);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [resolveTarget, setResolveTarget] = useState<DisputeRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { session } = useStaffSession();
  const canMutate = session?.role !== "STAFF";

  const fetchDisputes = useCallback(async (status: Filter, signal: AbortSignal) => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(
        `/admin/matches/disputes?status=${encodeURIComponent(status)}`,
        { signal },
      );
      if (signal.aborted) return;
      setItems(data.items);
      setError(null);
      setEndpointGap(false);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof ApiError && err.code === "ABORTED") return;
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setEndpointGap(true);
        setItems([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load disputes");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const kickFetch = useCallback((status: Filter) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchDisputes(status, controller.signal);
  }, [fetchDisputes]);

  useEffect(() => {
    kickFetch(filter);
    return () => {
      abortRef.current?.abort();
    };
  }, [kickFetch, filter]);

  const visible = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    return arr;
  }, [items]);

  const liveRegion = (
    <div role="status" aria-live="polite" className="sr-only">
      {loading
        ? "Loading disputes…"
        : `${visible.length} dispute${visible.length === 1 ? "" : "s"} shown`}
    </div>
  );

  const filterBar = (
    <div className="mb-4 flex items-center justify-between">
      <div className="inline-flex gap-1 rounded-button border border-th-divider bg-th-bg p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-th-gold text-black"
                : "text-th-text-secondary hover:text-th-text"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="text-xs text-th-text-secondary">
        {visible.length} {visible.length === 1 ? "dispute" : "disputes"}
      </div>
    </div>
  );

  const modal = (
    <ResolveDisputeModal
      open={resolveTarget !== null}
      dispute={resolveTarget}
      onClose={() => setResolveTarget(null)}
      onResolved={() => kickFetch(filter)}
    />
  );

  if (endpointGap) {
    return (
      <>
        {liveRegion}
        {filterBar}
        <div className="rounded-card border border-[#F39C12]/40 bg-[#F39C12]/10 p-4 text-xs text-[#F39C12]">
          <p>
            Backend <code>GET /v1/admin/matches/disputes</code> not yet implemented or unreachable.
            Founder gap — dispute queue endpoint pending.
          </p>
          <button
            onClick={() => kickFetch(filter)}
            className="mt-3 rounded-button border border-[#F39C12]/60 px-3 py-1 text-xs font-medium text-[#F39C12] hover:bg-[#F39C12]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F39C12]"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        {liveRegion}
        {filterBar}
        <div className="rounded-card border border-th-divider bg-th-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse border-b border-th-divider last:border-0" />
          ))}
        </div>
        {modal}
      </>
    );
  }

  if (error) {
    return (
      <>
        {liveRegion}
        {filterBar}
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => kickFetch(filter)}
            className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
        {modal}
      </>
    );
  }

  if (visible.length === 0) {
    return (
      <>
        {liveRegion}
        {filterBar}
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center text-th-text-secondary">
          {filter === "OPEN"
            ? "No open disputes. Quiet day."
            : filter === "RESOLVED"
              ? "No resolved disputes yet (RESOLVED + REJECTED)."
              : "No disputes."}
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      {liveRegion}
      {filterBar}
      <div className="overflow-hidden rounded-card border border-th-divider bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg text-xs uppercase tracking-wide text-th-text-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Dispute</th>
              <th className="px-4 py-3 text-left font-medium">Booking</th>
              <th className="px-4 py-3 text-left font-medium">Reporter</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Stake</th>
              <th className="px-4 py-3 text-left font-medium">Reported</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id} className="border-t border-th-divider">
                <td className="px-4 py-3 font-mono text-xs text-th-text">{shortId(d.id)}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/bookings/${d.booking.id}` as Route}
                    aria-label={`Open booking ${shortId(d.booking.id)}`}
                    className="text-th-text-secondary hover:text-th-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold rounded-sm"
                  >
                    {shortId(d.booking.id)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-th-text">{d.openedBy.displayName}</td>
                <td className="px-4 py-3">
                  <ClaimTypePill value={d.claimType} />
                </td>
                <td className="px-4 py-3 text-xs text-th-text-secondary">
                  <span className="line-clamp-1 max-w-xs" title={d.reason}>
                    {d.reason}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-th-text">
                  {d.booking.totalAmount > 0 ? formatAED(d.booking.totalAmount) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-th-text-secondary">
                  {formatDateTime(d.openedAt)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DOT[d.status] }} />
                    <span className="text-th-text">{d.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/matches/${d.id}` as Route}
                      className="rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text-secondary hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
                    >
                      Match ↗
                    </Link>
                    {d.status === "OPEN" && canMutate ? (
                      <button
                        onClick={() => setResolveTarget({
                          id: d.id,
                          bookingId: d.booking.id,
                          reason: d.reason,
                          openedAt: d.openedAt,
                          openedBy: d.openedBy,
                          hostUserId: d.booking.hostUserId,
                          opponentUserId: d.booking.opponentUserId,
                          stakeFils: d.booking.totalAmount,
                          startAt: d.booking.startAt,
                        })}
                        className="rounded-button bg-th-gold px-3 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-xs text-th-text-tertiary">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal}
    </>
  );
}
