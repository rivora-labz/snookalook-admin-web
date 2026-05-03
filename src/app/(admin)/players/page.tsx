"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { SkillTier } from "@rivora-labz/snook-shared/enums";
import { apiFetch, formatDate } from "../../../lib/api";

interface PlayerItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string;
  skillTier: SkillTier;
  winRate: number;
  gamesPlayed: number;
  rating: number;
  joinedAt: string;
}

const TIER_COLOR: Record<SkillTier, string> = {
  BEGINNER: "#CD7F32",
  INTERMEDIATE: "#C0C0C0",
  ADVANCED: "#D4AF37",
  PRO: "#E5E4E2",
};

const TIER_LABEL: Record<SkillTier, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  PRO: "Pro",
};

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-th-text-tertiary">
          Roster Surface
        </div>
        <h1 className="font-display text-3xl text-th-text">Players</h1>
        <p className="mt-2 text-th-text-secondary">Players who have booked at your center.</p>
      </header>

      <div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-th-divider bg-th-card px-4 py-3 text-sm text-th-text placeholder-th-text-tertiary outline-none focus:border-th-gold"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => fetchPlayers(search)}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {/* Player list */}
      <div className="overflow-hidden rounded-[24px] border border-th-divider bg-th-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-th-divider" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="p-8 text-center text-sm text-th-text-tertiary">
            {search ? "No players match your search." : "No players found."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                <th className="px-5 py-2.5 font-medium">Player</th>
                <th className="px-5 py-2.5 font-medium">Phone</th>
                <th className="px-5 py-2.5 font-medium">Skill Tier</th>
                <th className="px-5 py-2.5 font-medium">Win Rate</th>
                <th className="px-5 py-2.5 font-medium">Games</th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
                <th className="px-5 py-2.5 font-medium" aria-label="View" />
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.userId}
                  onClick={() => router.push(`/players/${p.userId}` as Route)}
                  className="cursor-pointer border-b border-th-divider/50 transition-colors hover:bg-th-hover"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-black"
                        style={{ backgroundColor: TIER_COLOR[p.skillTier] }}
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-th-text">{p.displayName}</div>
                        {p.email && (
                          <div className="text-xs text-th-text-tertiary">{p.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-th-text-secondary">{p.phone}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: TIER_COLOR[p.skillTier], color: p.skillTier === "PRO" ? "#111" : "#fff" }}
                    >
                      {TIER_LABEL[p.skillTier]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-th-text-secondary">
                    {(p.winRate * 100).toFixed(0)}%
                  </td>
                  <td className="px-5 py-3 font-mono text-th-text-secondary">{p.gamesPlayed}</td>
                  <td className="px-5 py-3 text-th-text-secondary">{formatDate(p.joinedAt)}</td>
                  <td className="px-5 py-3 text-right text-th-text-tertiary">
                    <span aria-hidden="true">›</span>
                    <span className="sr-only">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
