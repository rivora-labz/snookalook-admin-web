"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { MagnifyingGlass, Funnel, DotsThree, Users, UserPlus } from "phosphor-react";
import type { SkillTier } from "@rivora-labz/snook-shared";
import { apiFetch, formatAED } from "../../../lib/api";
import { formatDate } from "../../../lib/datetime";
import PlayerAvatar from "../../../components/PlayerAvatar";

interface PlayerItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  memberId?: string;
  skillTier: SkillTier;
  spend?: number;
  matchesPlayed?: number;
  gamesPlayed?: number;
  lastVisit?: string;
  joinedAt?: string;
  status?: "Active" | "Inactive" | "Banned";
}

const TIER_BADGE: Record<SkillTier, string> = {
  BEGINNER: "bg-[#CD7F32]/20 text-[#CD7F32] border-[#CD7F32]/30",
  INTERMEDIATE: "bg-zinc-400/20 text-zinc-300 border-zinc-500/30",
  ADVANCED: "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
  PRO: "text-[#E5E4E2] bg-[#E5E4E2]/20 border-[#E5E4E2]/30",
};

const TIER_LABEL: Record<SkillTier, string> = {
  BEGINNER: "Bronze",
  INTERMEDIATE: "Silver",
  ADVANCED: "Gold",
  PRO: "Platinum",
};

const STATUS_DOT: Record<string, string> = {
  Active: "bg-[#2ECC71]",
  Inactive: "bg-[#E67E22]",
  Banned: "bg-[#E74C3C]",
};

const TIER_FILTERS = ["All", "Bronze", "Silver", "Gold", "Platinum"] as const;
const STATUS_FILTERS = ["All", "Active", "Inactive", "Banned"] as const;

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [joinedFilter, setJoinedFilter] = useState("all");

  const fetchPlayers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=50` : "?limit=50";
      const data = await apiFetch<{ items: PlayerItem[] }>(`/admin/players${params}`);
      setPlayers(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchPlayers(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchPlayers]);

  const filtered = players.filter((p) => {
    if (tierFilter !== "All" && TIER_LABEL[p.skillTier] !== tierFilter) return false;
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch("");
    setTierFilter("All");
    setStatusFilter("All");
    setJoinedFilter("all");
  };

  const isFiltered = !!(search || tierFilter !== "All" || statusFilter !== "All");

  return (
    <div className="flex flex-col h-full bg-th-bg">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-th-text">Players Database</h1>
          <p className="mt-1 font-inter text-[14px] text-th-text-tertiary">
            Manage registered players at your center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex h-[40px] items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-colors ${
              showFilters
                ? "border-[#D4AF37]/50 bg-th-card text-[#D4AF37]"
                : "border-th-divider text-th-text hover:bg-th-card"
            }`}
          >
            <Funnel size={16} />
            Filter
          </button>
          <button className="flex h-[40px] items-center gap-2 rounded-lg bg-[#D4AF37] px-5 font-display text-[14px] font-semibold text-black shadow-gold-glow hover:bg-[#F7D774] transition-colors">
            <UserPlus size={16} />
            Invite Player
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="relative flex flex-col flex-1 overflow-hidden rounded-[20px] border border-th-divider bg-th-card">
        {/* Search bar */}
        <div className="p-4 border-b border-th-divider">
          <div className="relative max-w-md">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-th-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-th-elevated border border-[var(--th-border-medium)] rounded-lg pl-10 pr-4 py-2 text-[14px] text-th-text placeholder:text-th-text-tertiary focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Table / states */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-th-divider" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-12">
              <p className="text-[#E74C3C] mb-3">{error}</p>
              <button
                onClick={() => fetchPlayers(search)}
                className="rounded-lg bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-th-card border border-[var(--th-border-medium)] mb-4">
                <Users size={32} className="text-th-text-tertiary" />
              </div>
              <h2 className="font-display text-[18px] font-medium text-th-text">No players found</h2>
              <p className="font-inter text-[14px] text-th-text-tertiary max-w-md mx-auto mb-6 mt-2">
                {isFiltered
                  ? "No players match your current filters."
                  : "No players registered yet."}
              </p>
              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="rounded-lg border border-th-divider px-4 py-2 text-[14px] text-th-text hover:bg-th-hover transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-th-elevated sticky top-0 z-10 border-b border-th-divider">
                <tr>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider">
                    Player
                  </th>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider text-right">
                    Spend
                  </th>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider text-center">
                    Matches
                  </th>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="py-3 px-6 font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--th-border)]">
                {filtered.map((p) => (
                  <tr
                    key={p.userId}
                    onClick={() => router.push(`/players/${p.userId}` as Route)}
                    className="cursor-pointer hover:bg-th-divider/30 transition-colors group"
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          url={p.avatarUrl}
                          name={p.displayName}
                          size={40}
                          className="border border-[var(--th-border-medium)]"
                        />
                        <div>
                          <div className="font-display text-[14px] font-semibold text-th-text truncate">
                            {p.displayName}
                          </div>
                          <div className="font-inter text-[12px] text-th-text-tertiary truncate">
                            {p.memberId ? `${p.memberId} · ` : ""}
                            {p.email ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${TIER_BADGE[p.skillTier]}`}
                      >
                        {TIER_LABEL[p.skillTier]}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-[14px] text-th-text">
                      {p.spend != null ? formatAED(p.spend) : "—"}
                    </td>
                    <td className="py-3 px-6 text-center font-inter text-[14px] text-th-text-secondary">
                      {p.matchesPlayed ?? p.gamesPlayed ?? "—"}
                    </td>
                    <td className="py-3 px-6 font-inter text-[13px] text-th-text-secondary">
                      {p.lastVisit ?? (p.joinedAt ? formatDate(p.joinedAt) : "—")}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            STATUS_DOT[p.status ?? "Active"] ?? "bg-th-text-tertiary"
                          }`}
                        />
                        <span className="font-inter text-[13px] text-th-text">
                          {p.status ?? "Active"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 w-12">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--th-hover)] text-th-text-tertiary hover:text-th-text"
                        aria-label="Player actions"
                      >
                        <DotsThree size={20} weight="bold" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Filter panel — absolute overlay, no animation per contract */}
        {showFilters && (
          <div className="absolute right-0 top-0 w-80 h-full bg-th-card border-l border-th-divider z-20 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-th-divider flex items-center justify-between">
              <h3 className="font-display text-[16px] font-semibold text-th-text">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-th-text-tertiary hover:text-th-text transition-colors"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider mb-3">
                  Tier
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIER_FILTERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTierFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                        tierFilter === t
                          ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30"
                          : "bg-transparent text-th-text border-[var(--th-border-medium)] hover:border-[var(--th-text-tertiary)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider mb-3">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                        statusFilter === s
                          ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30"
                          : "bg-transparent text-th-text border-[var(--th-border-medium)] hover:border-[var(--th-text-tertiary)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wider mb-3">
                  Joined Date
                </p>
                <select
                  value={joinedFilter}
                  onChange={(e) => setJoinedFilter(e.target.value)}
                  className="w-full bg-th-elevated border border-[var(--th-border-medium)] rounded-lg px-3 py-2 text-[14px] text-th-text focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-th-divider flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-lg border border-th-divider px-4 py-2 text-[14px] text-th-text hover:bg-th-hover transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 rounded-lg bg-[#D4AF37] px-4 py-2 text-[14px] font-semibold text-black hover:bg-[#F7D774] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
