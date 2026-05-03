"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { apiFetch, ApiError, formatDate } from "../../../lib/api";

interface WaitlistEntry {
  id: string;
  email: string;
  source: string | null;
  status: "pending" | "notified";
  createdAt: string;
}

interface ListResponse {
  items: WaitlistEntry[];
  total: number;
  nextCursor: string | null;
}

const PAGE_SIZE = 100;

function exportCsv(entries: WaitlistEntry[]) {
  const header = ["#", "Email", "Source", "Signed Up", "Status"];
  const rows = entries.map((e, i) => [
    String(i + 1),
    e.email,
    e.source ?? "",
    formatDate(e.createdAt),
    e.status,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `waitlist-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "notified">("all");
  const [patching, setPatching] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    try {
      const data = await apiFetch<ListResponse>(`/admin/waitlist?${params.toString()}`);
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      if (err instanceof ApiError && err.code === "ABORTED") return null;
      throw err;
    }
  }, []);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage();
      if (signal.aborted || !data) return;
      setEntries(data.items);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load waitlist");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursor);
      if (!data) return;
      setEntries((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  const markNotified = useCallback(async (id: string) => {
    setPatching((prev) => new Set(prev).add(id));
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "notified" as const } : e)),
    );
    try {
      await apiFetch(`/admin/waitlist/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "notified" }),
      });
    } catch (err) {
      // Roll back on failure
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "pending" as const } : e)),
      );
      setError(err instanceof Error ? err.message : "Failed to mark as notified");
    } finally {
      setPatching((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.email.toLowerCase().includes(q));
    }
    return list;
  }, [entries, search, statusFilter]);

  const pendingCount = useMemo(() => entries.filter((e) => e.status === "pending").length, [entries]);
  const notifiedCount = useMemo(() => entries.filter((e) => e.status === "notified").length, [entries]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-th-text">Waitlist</h1>
            {!loading && (
              <span className="rounded-pill bg-th-gold/10 px-2.5 py-0.5 text-sm font-medium text-th-gold">
                {total} signup{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="mt-1 text-th-text-secondary">
            Pre-launch signups for manual outreach
          </p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
          className="rounded-button border border-th-divider px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-card border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-4 py-3 text-sm text-[#E74C3C]">
          {error}
          <button
            onClick={() => {
              const controller = new AbortController();
              abortRef.current = controller;
              setError(null);
              load(controller.signal);
            }}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-input border border-th-divider bg-th-card px-4 py-2 text-sm text-th-text placeholder-th-text-tertiary outline-none focus:border-th-gold"
        />
        <div
          role="tablist"
          aria-label="Status filter"
          className="inline-flex rounded-button border border-th-divider bg-th-card p-0.5 text-xs"
        >
          {(["all", "pending", "notified"] as const).map((v) => {
            const label =
              v === "all"
                ? `All (${entries.length})`
                : v === "pending"
                  ? `Pending (${pendingCount})`
                  : `Notified (${notifiedCount})`;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={statusFilter === v}
                onClick={() => setStatusFilter(v)}
                className={`rounded-button px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === v
                    ? "bg-th-gold text-black"
                    : "text-th-text-secondary hover:text-th-text"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-card border border-th-divider bg-th-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-th-text-secondary">
              {entries.length === 0 ? "No waitlist signups yet." : "No entries match your filter."}
            </p>
            {entries.length === 0 && (
              <p className="mt-1 text-sm text-th-text-tertiary">
                Share the marketing page to collect emails.
              </p>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                  <th className="w-10 px-5 py-2.5 font-medium">#</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Signed Up</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const isPending = entry.status === "pending";
                  const isPending2 = patching.has(entry.id) ? false : isPending;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-th-divider/50 last:border-b-0 hover:bg-th-hover"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-th-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-5 py-3 font-medium text-th-text">{entry.email}</td>
                      <td className="px-5 py-3 text-th-text-secondary">
                        {entry.source ?? <span className="text-th-text-tertiary">—</span>}
                      </td>
                      <td className="px-5 py-3 text-th-text-secondary">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.status === "notified" ? (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-[#0B3D2E]/30 px-2 py-0.5 text-xs font-medium text-[#2ECC71]">
                            Notified ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-[#F39C12]/15 px-2 py-0.5 text-xs font-medium text-[#F39C12]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isPending2 && (
                          <button
                            onClick={() => markNotified(entry.id)}
                            disabled={patching.has(entry.id)}
                            className="rounded-button border border-th-divider px-3 py-1 text-xs font-medium text-th-text-secondary hover:bg-th-hover hover:text-th-text disabled:opacity-50"
                          >
                            {patching.has(entry.id) ? "Saving…" : "Mark Notified"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {nextCursor && (
              <div className="border-t border-th-divider px-5 py-3 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:bg-th-hover disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : `Load more (${total - entries.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
