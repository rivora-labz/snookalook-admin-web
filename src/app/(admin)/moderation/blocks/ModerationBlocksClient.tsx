"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch, ApiError } from "../../../../lib/api";
import { formatDateTime } from "../../../../lib/datetime";

interface BlockItem {
  id: string;
  blocker: { id: string; displayName: string };
  blocked: { id: string; displayName: string };
  createdAt: string;
}

interface BlocksResponse {
  items: BlockItem[];
  nextCursor: string | null;
}

const PAGE_SIZE = 50;

function shortId(id: string): string {
  return id.slice(0, 8);
}

export default function ModerationBlocksClient() {
  const [items, setItems] = useState<BlockItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointGap, setEndpointGap] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) qs.set("cursor", cursor);
      try {
        const data = await apiFetch<BlocksResponse>(
          `/admin/moderation/blocks?${qs}`,
          { signal },
        );
        if (signal.aborted) return;
        if (cursor) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor ?? null);
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
          setError(err instanceof Error ? err.message : "Failed to load blocks");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetchPage(null, ctrl.signal);
  }, [fetchPage]);

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingMore(true);
    fetchPage(nextCursor, ctrl.signal);
  };

  const liveRegion = (
    <div role="status" aria-live="polite" className="sr-only">
      {loading
        ? "Loading block list…"
        : `${items.length} block${items.length === 1 ? "" : "s"} shown`}
    </div>
  );

  if (endpointGap) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-[#F39C12]/40 bg-[#F39C12]/10 p-4 text-xs text-[#F39C12]">
          <p>
            Backend <code>GET /v1/admin/moderation/blocks</code> not yet implemented.
            Admin blocks endpoint is a Phase 2 deliverable.
          </p>
          <button
            onClick={refresh}
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
        <div className="overflow-hidden rounded-card border border-th-divider bg-th-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b border-th-divider last:border-0"
            />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-th-divider bg-th-card p-12 text-center">
          <p className="text-lg font-medium text-th-text">No blocks on record</p>
          <p className="mt-1 text-sm text-th-text-secondary">No users have blocked each other yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {liveRegion}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-th-text-secondary">
          {items.length} block{items.length === 1 ? "" : "s"}
          {nextCursor ? "+" : ""}
        </span>
        <button
          onClick={refresh}
          className="rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text-secondary hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-th-divider bg-th-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="User block list">
            <thead className="bg-th-bg text-xs uppercase tracking-wide text-th-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Block ID</th>
                <th className="px-4 py-3 text-left font-medium">Blocker</th>
                <th className="px-4 py-3 text-left font-medium">Blocked</th>
                <th className="px-4 py-3 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-th-divider">
                  <td className="px-4 py-3 font-mono text-xs text-th-text-secondary">
                    {shortId(b.id)}
                  </td>
                  <td className="px-4 py-3 text-th-text">{b.blocker.displayName}</td>
                  <td className="px-4 py-3 text-th-text">{b.blocked.displayName}</td>
                  <td className="px-4 py-3 text-xs text-th-text-secondary">
                    {formatDateTime(b.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="border-t border-th-divider p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-button border border-th-divider px-4 py-2 text-xs text-th-text-secondary hover:text-th-text disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
