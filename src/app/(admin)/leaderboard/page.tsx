"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Trophy, CaretDown } from "phosphor-react";
import { apiFetch } from "../../../lib/api";
import { Skeleton } from "../../../components/Skeleton";
import ErrorRetry from "../../../components/ErrorRetry";

type Tier = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PRO";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  rating: number;
  rank: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  nextCursor: string | null;
}

const TIER_COLOR: Record<Tier, string> = {
  PRO: "#D4AF37",
  ADVANCED: "#9B59B6",
  INTERMEDIATE: "#3498DB",
  BEGINNER: "#808080",
};

const TIERS: (Tier | "ALL")[] = ["ALL", "PRO", "ADVANCED", "INTERMEDIATE", "BEGINNER"];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tierFilter, setTierFilter] = useState<Tier | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const qs = tierFilter === "ALL" ? "?limit=50" : `?tier=${tierFilter}&limit=50`;
      const data = await apiFetch<LeaderboardResponse>(`/leaderboard${qs}`);
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [tierFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-th-text">Leaderboard</h1>
          <p className="mt-1 text-th-text-secondary">
            Top players ranked by rating across all centers
          </p>
        </div>
        <div className="relative">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as Tier | "ALL")}
            aria-label="Filter by tier"
            className="appearance-none rounded-button border border-th-divider bg-th-card px-4 py-2 pr-9 text-sm text-th-text outline-none focus:border-th-gold"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "All tiers" : t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <CaretDown
            size={12}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-th-text-tertiary"
          />
        </div>
      </header>

      {error && !loading && (
        <ErrorRetry message={error} onRetry={retry} />
      )}

      {!error && (
        <div className="rounded-card border border-th-divider bg-th-card overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_140px_100px] gap-4 border-b border-th-divider px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">
            <span>Rank</span>
            <span>Player</span>
            <span>Tier</span>
            <span className="text-right">Rating</span>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-sm text-th-text-tertiary">
              No leaderboard entries
              {tierFilter !== "ALL" ? ` for ${tierFilter.toLowerCase()} tier` : ""}.
            </div>
          ) : (
            entries.map((e) => (
              <Link
                key={e.userId}
                href={`/players/${e.userId}` as never}
                className="grid grid-cols-[60px_1fr_140px_100px] items-center gap-4 border-t border-th-divider/50 px-5 py-3 transition-colors hover:bg-[var(--th-hover)]"
              >
                <div className="flex items-center gap-2">
                  {e.rank <= 3 ? (
                    <Trophy
                      size={16}
                      weight="fill"
                      style={{ color: e.rank === 1 ? "#D4AF37" : e.rank === 2 ? "#C0C0C0" : "#CD7F32" }}
                    />
                  ) : null}
                  <span className="font-mono text-sm text-th-text">#{e.rank}</span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  {e.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.avatarUrl}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-full bg-th-divider" />
                  )}
                  <span className="truncate text-sm text-th-text">{e.displayName}</span>
                </div>
                <span
                  className="inline-block w-fit rounded-pill px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${TIER_COLOR[e.tier]}33`, color: TIER_COLOR[e.tier] }}
                >
                  {e.tier.charAt(0) + e.tier.slice(1).toLowerCase()}
                </span>
                <span className="text-right font-mono text-sm font-medium text-th-text">
                  {e.rating.toFixed(0)}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
