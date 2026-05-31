"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFocusTrap } from "../../../../lib/use-focus-trap";
import type { Route } from "next";
import type { BookingState, MatchMode, SkillTier } from "@rivora-labz/snook-shared";
import type {
  AdminPlayerDetail,
  AdminChallengeSummary,
  AdminPlayerBookingItem,
  AdminPlayerMatchItem,
  AdminPlayerMatchResult,
} from "@rivora-labz/snook-shared";
import { apiFetch, formatAED, ApiError } from "../../../../lib/api";
import { formatDate, formatTime, formatDateTime } from "../../../../lib/datetime";
import { useStaffSession } from "../../../../lib/use-staff-session";

type ChallengeDirection = "sent" | "received";
type BookingStatusFilter = "ALL" | BookingState;
type MatchResultFilter = "ALL" | AdminPlayerMatchResult;
type PlayerHistoryType = "BOOKING" | "PAYMENT";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  booking: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    table: { tableNumber: number; type: string };
    startAt: string;
  };
}

interface PlayerHistoryRow {
  id: string;
  type: PlayerHistoryType;
  occurredAt: string;
  headline: string;
  detail: string;
  statusLabel: string;
  statusColor: string;
  amountFils: number | null;
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

const STATE_COLOR: Record<string, string> = {
  CONFIRMED: "#0B3D2E",
  PENDING: "#F39C12",
  CHECKED_IN: "#3498DB",
  CANCELLED: "#6B6B6B",
  NO_SHOW: "#E74C3C",
  COMPLETED: "#0B3D2E",
  DISPUTED: "#E74C3C",
};

const STATE_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CHECKED_IN: "Checked In",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
};

const BOOKING_STATUS_OPTIONS: BookingStatusFilter[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const RESULT_COLOR: Record<AdminPlayerMatchResult, string> = {
  WIN: "#0B3D2E", // brand green
  LOSS: "#E74C3C", // red
  DRAW: "#6B6B6B", // gray
  FORFEIT: "#F39C12", // amber
};

const RESULT_OPTIONS: MatchResultFilter[] = ["ALL", "WIN", "LOSS", "DRAW", "FORFEIT"];

const CHALLENGE_STATUS_COLOR: Record<string, string> = {
  PENDING: "#F39C12",
  ACCEPTED: "#0B3D2E",
  DECLINED: "#6B6B6B",
  EXPIRED: "#6B6B6B",
  CANCELLED: "#6B6B6B",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  CAPTURED: "#0B3D2E",
  AUTHORIZED: "#0B3D2E",
  PENDING: "#F39C12",
  FAILED: "#E74C3C",
  REFUNDED: "#3498DB",
};

function RiskFlags({
  cancellationsLast30d,
  noShowCount,
  refundCount,
  totalFetched,
}: {
  cancellationsLast30d: number;
  noShowCount: number;
  refundCount: number;
  totalFetched: number;
}) {
  const highCancels = cancellationsLast30d > 3;
  const highNoShows = noShowCount > 2;
  const refundRate = totalFetched > 0 ? refundCount / totalFetched : 0;
  const highRefunds = refundRate > 0.2;

  if (!highCancels && !highNoShows && !highRefunds && cancellationsLast30d === 0 && noShowCount === 0 && refundCount === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-card border border-[#0B3D2E]/40 bg-[#0B3D2E]/10 px-4 py-2.5 text-xs text-[#2ECC71]">
        <span>✓</span>
        <span>No risk flags in recent activity.</span>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-card border border-th-divider bg-th-card p-4">
      <div className="mb-2 text-xs font-medium text-th-text-secondary">Risk Flags</div>
      <div className="flex flex-wrap gap-2">
        <RiskBadge
          label={`${cancellationsLast30d} cancel${cancellationsLast30d !== 1 ? "s" : ""} (30d)`}
          alert={highCancels}
          tooltip="Threshold: >3 cancellations in last 30 days"
        />
        <RiskBadge
          label={`${noShowCount} no-show${noShowCount !== 1 ? "s" : ""}`}
          alert={highNoShows}
          tooltip="Threshold: >2 all-time no-shows"
        />
        <RiskBadge
          label={`${(refundRate * 100).toFixed(0)}% refund rate`}
          alert={highRefunds}
          tooltip="Threshold: >20% of fetched bookings refunded"
        />
      </div>
    </div>
  );
}

function RiskBadge({ label, alert, tooltip }: { label: string; alert: boolean; tooltip: string }) {
  return (
    <span
      title={tooltip}
      className="inline-block rounded-pill px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: alert ? "#E74C3C22" : "var(--th-elevated, #1A1A1A)",
        color: alert ? "#E74C3C" : "var(--th-text-secondary, #B0B0B0)",
        border: `1px solid ${alert ? "#E74C3C44" : "var(--th-divider, #2A2A2A)"}`,
      }}
    >
      {alert ? "⚠ " : ""}{label}
    </span>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function gameModeLabel(mode: MatchMode): string {
  switch (mode) {
    case "SOLO":
      return "Solo";
    case "FIND_OPPONENT":
      return "Find Opponent";
    case "INVITE_FRIEND":
      return "Invite Friend";
    case "QUICK_MATCH":
      return "Quick Match";
    default:
      return mode;
  }
}

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id ?? "";

  const { session } = useStaffSession();
  const canMutate = session?.role === "OWNER" || session?.role === "MANAGER";

  const [player, setPlayer] = useState<AdminPlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  // Ban dialog
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const banDialogRef = useFocusTrap<HTMLDivElement>(banOpen, () => {
    if (!banSubmitting) setBanOpen(false);
  });

  // Unban dialog
  const [unbanOpen, setUnbanOpen] = useState(false);
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);
  const [unbanError, setUnbanError] = useState<string | null>(null);
  const unbanDialogRef = useFocusTrap<HTMLDivElement>(unbanOpen, () => {
    if (!unbanSubmitting) setUnbanOpen(false);
  });

  // Challenges drawer
  const [challengesDir, setChallengesDir] = useState<ChallengeDirection | null>(null);
  const [challenges, setChallenges] = useState<AdminChallengeSummary[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengesError, setChallengesError] = useState<string | null>(null);
  const challengesDrawerRef = useFocusTrap<HTMLDivElement>(challengesDir !== null, () => {
    setChallengesDir(null);
    setChallenges([]);
    setChallengesError(null);
  });

  // Recent bookings
  const [bookings, setBookings] = useState<AdminPlayerBookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<BookingStatusFilter>("ALL");
  const [bookingPage, setBookingPage] = useState(0);

  // Recent matches
  const [matches, setMatches] = useState<AdminPlayerMatchItem[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<MatchResultFilter>("ALL");

  // Payment-backed activity history
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);

  const showToast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchPlayer = useCallback(async (): Promise<AdminPlayerDetail | null> => {
    try {
      const detail = await apiFetch<AdminPlayerDetail>(`/admin/players/${userId}`);
      setPlayer(detail);
      setNotFound(false);
      setError(null);
      return detail;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setPlayer(null);
        return null;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load player",
      );
      return null;
    }
  }, [userId]);

  const fetchBookings = useCallback(
    async (status: BookingStatusFilter) => {
      setBookingsLoading(true);
      setBookingsError(null);
      try {
        const qs = new URLSearchParams({ limit: "50" });
        if (status !== "ALL") qs.set("status", status);
        const resp = await apiFetch<{ items: AdminPlayerBookingItem[] }>(
          `/admin/players/${userId}/bookings?${qs.toString()}`,
        );
        setBookings(resp.items);
      } catch (err) {
        setBookingsError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load bookings",
        );
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    },
    [userId],
  );

  const fetchMatches = useCallback(
    async (result: MatchResultFilter) => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        const qs = new URLSearchParams({ limit: "10" });
        if (result !== "ALL") qs.set("result", result);
        const resp = await apiFetch<{ items: AdminPlayerMatchItem[] }>(
          `/admin/players/${userId}/matches?${qs.toString()}`,
        );
        setMatches(resp.items);
      } catch (err) {
        setMatchesError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load matches",
        );
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    },
    [userId],
  );

  const fetchPayments = useCallback(async () => {
    if (!canMutate) {
      setPayments([]);
      setPaymentsLoading(false);
      setPaymentsError(null);
      return;
    }
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const resp = await apiFetch<{ items: PaymentHistoryItem[] }>("/admin/payments?limit=100");
      setPayments(resp.items.filter((item) => item.booking.host.id === userId));
    } catch (err) {
      setPaymentsError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load payment history",
      );
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [canMutate, userId]);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    const detail = await fetchPlayer();
    if (detail) {
      // Parallel — independent endpoints.
      await Promise.all([fetchBookings("ALL"), fetchMatches("ALL"), fetchPayments()]);
    }
    setLoading(false);
  }, [fetchPlayer, fetchBookings, fetchMatches, fetchPayments]);

  useEffect(() => {
    if (userId) initialLoad();
  }, [userId, initialLoad]);

  // Re-fetch when filters change (skipped on first mount because initialLoad already
  // primed the lists with "ALL"; subsequent filter changes trigger a re-fetch here).
  useEffect(() => {
    if (!loading && !notFound && player) {
      setBookingPage(0);
      fetchBookings(bookingFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingFilter]);

  useEffect(() => {
    if (!loading && !notFound && player) {
      fetchMatches(matchFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchFilter]);

  useEffect(() => {
    setHistoryPage(0);
  }, [bookings, payments]);

  const handleBanSubmit = async () => {
    const trimmed = banReason.trim();
    if (trimmed.length < 3) {
      setBanError("Reason must be at least 3 characters.");
      return;
    }
    setBanError(null);
    setBanSubmitting(true);
    try {
      const detail = await apiFetch<AdminPlayerDetail>(`/admin/players/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: trimmed }),
      });
      setPlayer(detail);
      setBanOpen(false);
      setBanReason("");
      showToast("Player banned. Bookings at this center cancelled.", "ok");
      // Cascade-cancelled bookings affect the recent list; refresh it.
      await Promise.all([fetchBookings(bookingFilter), fetchPayments()]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to ban player";
      setBanError(msg);
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleUnban = async () => {
    setUnbanError(null);
    setUnbanSubmitting(true);
    try {
      const detail = await apiFetch<AdminPlayerDetail>(`/admin/players/${userId}/unban`, {
        method: "POST",
      });
      setPlayer(detail);
      setUnbanOpen(false);
      showToast("Player unbanned.", "ok");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to unban player";
      setUnbanError(msg);
      showToast(msg, "err");
    } finally {
      setUnbanSubmitting(false);
    }
  };

  const historyRows: PlayerHistoryRow[] = [...bookings.map((booking) => ({
    id: `booking-${booking.id}`,
    type: "BOOKING" as const,
    occurredAt: booking.createdAt,
    headline: booking.status === "CANCELLED" ? "Booking cancelled" : "Booking created",
    detail: `${booking.clubName} · ${booking.tableLabel} · scheduled ${formatDateTime(booking.scheduledAt)}`,
    statusLabel: STATE_LABEL[booking.status] ?? booking.status,
    statusColor: STATE_COLOR[booking.status] ?? "#6B6B6B",
    amountFils: booking.totalFils,
  })), ...payments.map((payment) => ({
    id: `payment-${payment.id}`,
    type: "PAYMENT" as const,
    occurredAt: payment.createdAt,
    headline: payment.status === "REFUNDED" ? "Payment refunded" : "Payment recorded",
    detail: `Table ${payment.booking.table.tableNumber} · booking ${formatDateTime(payment.booking.startAt)} · ${payment.method}`,
    statusLabel: payment.status,
    statusColor: PAYMENT_STATUS_COLOR[payment.status] ?? "#6B6B6B",
    amountFils: payment.amount,
  }))].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const openChallenges = useCallback(
    async (direction: ChallengeDirection) => {
      setChallengesDir(direction);
      setChallengesLoading(true);
      setChallengesError(null);
      setChallenges([]);
      try {
        const resp = await apiFetch<{ items: AdminChallengeSummary[] }>(
          `/admin/players/${userId}/challenges?direction=${direction}&limit=20`,
        );
        setChallenges(resp.items);
      } catch (err) {
        setChallengesError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load challenges",
        );
      } finally {
        setChallengesLoading(false);
      }
    },
    [userId],
  );

  const closeChallenges = () => {
    setChallengesDir(null);
    setChallenges([]);
    setChallengesError(null);
  };

  return (
    <div>
      <header className="mb-6">
        <button
          onClick={() => router.push("/players" as Route)}
          className="mb-2 text-sm text-th-text-tertiary hover:text-th-text"
        >
          ← Back to Players
        </button>
        <h1 className="font-display text-3xl text-th-text">Player Detail</h1>
      </header>

      {toast && (
        <div
          className={`mb-4 rounded-card border px-4 py-2.5 text-sm ${
            toast.tone === "err"
              ? "border-[#E74C3C]/40 bg-[#E74C3C]/10 text-[#E74C3C]"
              : "border-th-divider bg-th-card text-th-text-secondary"
          }`}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      {notFound && (
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
          <p className="text-th-text">Player not found.</p>
          <p className="mt-1 text-sm text-th-text-tertiary">
            This player has no bookings at your center, or the ID is invalid.
          </p>
          <button
            onClick={() => router.push("/players" as Route)}
            className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Back to Players
          </button>
        </div>
      )}

      {error && !notFound && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => initialLoad()}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !notFound ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-card bg-th-card" />
          <div className="h-24 animate-pulse rounded-card bg-th-card" />
          <div className="h-40 animate-pulse rounded-card bg-th-card" />
        </div>
      ) : player ? (
        <>
          {/* Profile card */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-black"
                  style={{ backgroundColor: TIER_COLOR[player.skillTier] }}
                >
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-pill px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: TIER_COLOR[player.skillTier],
                    color: player.skillTier === "PRO" ? "#111" : "#fff",
                  }}
                >
                  {TIER_LABEL[player.skillTier]}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl text-th-text">{player.displayName}</span>
                  {player.isBanned && (
                    <span
                      className="rounded-pill bg-[#E74C3C] px-2 py-0.5 text-[10px] font-medium text-white"
                      title={
                        [
                          player.bannedReason ? `Reason: ${player.bannedReason}` : null,
                          player.bannedAt ? `Banned at: ${formatDateTime(player.bannedAt)}` : null,
                        ]
                          .filter(Boolean)
                          .join("\n") || "Banned"
                      }
                    >
                      BANNED
                    </span>
                  )}
                </div>
                <div className="text-sm text-th-text-tertiary">{player.email ?? "—"}</div>
                <div className="text-sm text-th-text-tertiary">{player.phone}</div>
                <div className="mt-1 text-xs text-th-text-tertiary">
                  Joined {formatDate(player.joinedAt)}
                </div>
              </div>
              </div>
              {canMutate && (
                <div className="flex flex-wrap gap-2">
                  {!player.isBanned ? (
                    <button
                      onClick={() => {
                        setBanReason("");
                        setBanError(null);
                        setBanOpen(true);
                      }}
                      className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Ban Player
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setUnbanError(null);
                        setUnbanOpen(true);
                      }}
                      className="rounded-button bg-[#0B3D2E] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Restore Player
                    </button>
                  )}
                </div>
              )}
            </div>
            {player.isBanned && player.bannedReason && (
              <div className="mt-4 rounded border border-[#E74C3C]/40 bg-[#E74C3C]/5 p-3 text-xs text-th-text-secondary">
                <div className="font-medium text-[#E74C3C]">Ban reason</div>
                <div className="mt-1">{player.bannedReason}</div>
                {player.bannedAt && (
                  <div className="mt-1 text-th-text-tertiary">
                    Banned {formatDateTime(player.bannedAt)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* KPI strip — backend-computed */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Total Bookings</div>
              <div className="mt-1 font-mono text-2xl text-th-text">{player.totalBookings}</div>
              <div className="mt-1 text-[10px] text-th-text-tertiary">at this center</div>
            </div>
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Completion Rate</div>
              <div className="mt-1 font-mono text-2xl text-th-text">
                {(player.completionRate * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Cancellation Rate</div>
              <div className="mt-1 font-mono text-2xl text-th-text">
                {(player.cancellationRate * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">No-shows</div>
              <div className="mt-1 font-mono text-2xl text-th-text">{player.noShowCount}</div>
            </div>
          </div>

          {/* Risk flags */}
          <RiskFlags
            cancellationsLast30d={
              bookings.filter((b) => {
                const age = Date.now() - new Date(b.scheduledAt).getTime();
                return b.status === "CANCELLED" && age <= 30 * 24 * 3600_000;
              }).length
            }
            noShowCount={player.noShowCount}
            refundCount={bookings.filter((b) => b.refundedFils !== null && b.refundedFils > 0).length}
            totalFetched={bookings.length}
          />

          {/* Skill stats */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Rating</div>
              <div className="mt-1 font-mono text-lg text-th-text">
                {player.rating.toFixed(1)} / 5.0
              </div>
            </div>
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Win Rate</div>
              <div className="mt-1 font-mono text-lg text-th-text">
                {(player.winRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-card border border-th-divider bg-th-card p-4">
              <div className="text-xs text-th-text-tertiary">Games Played</div>
              <div className="mt-1 font-mono text-lg text-th-text">{player.gamesPlayed}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
            <h2 className="mb-4 font-display text-lg text-th-text">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openChallenges("sent")}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover"
              >
                View Challenges Sent
              </button>
              <button
                onClick={() => openChallenges("received")}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover"
              >
                View Challenges Received
              </button>
            </div>
          </div>

          {/* Activity history */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">History</h2>
              <p className="mt-1 text-xs text-th-text-tertiary">
                Bookings and payment activity for this player, newest first.
              </p>
            </div>
            {!canMutate ? (
              <div className="p-6 text-sm text-th-text-tertiary">
                History is visible to owners and managers only.
              </div>
            ) : paymentsLoading && historyRows.length === 0 ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : paymentsError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {paymentsError}
                <div className="mt-3">
                  <button
                    onClick={() => fetchPayments()}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                No booking or payment history yet.
              </div>
            ) : (() => {
              const PAGE_SIZE = 25;
              const totalPages = Math.ceil(historyRows.length / PAGE_SIZE);
              const paged = historyRows.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE);
              return (
                <>
                  <ul className="divide-y divide-th-divider/60">
                    {paged.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-th-text">{item.headline}</span>
                            <span
                              className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: item.statusColor }}
                            >
                              {item.statusLabel}
                            </span>
                            <span className="rounded-pill border border-th-divider px-2 py-0.5 text-[10px] font-medium text-th-text-tertiary">
                              {item.type}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-th-text-secondary">{item.detail}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-th-text-tertiary">{formatDateTime(item.occurredAt)}</div>
                          {item.amountFils !== null && (
                            <div className="mt-1 font-mono text-sm text-th-text-secondary">
                              {formatAED(item.amountFils)}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-th-divider px-5 py-3">
                      <span className="text-xs text-th-text-tertiary">
                        Page {historyPage + 1} of {totalPages} · {historyRows.length} total
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
                          disabled={historyPage === 0}
                          className="rounded-button border border-th-divider px-3 py-1 text-xs text-th-text-secondary hover:bg-th-hover disabled:opacity-40"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setHistoryPage((page) => Math.min(totalPages - 1, page + 1))}
                          disabled={historyPage >= totalPages - 1}
                          className="rounded-button border border-th-divider px-3 py-1 text-xs text-th-text-secondary hover:bg-th-hover disabled:opacity-40"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Recent bookings */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Recent Bookings</h2>
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value as BookingStatusFilter)}
                className="rounded-input border border-th-divider bg-th-bg px-3 py-1.5 text-xs text-th-text outline-none focus:border-th-gold"
                aria-label="Filter bookings by status"
              >
                {BOOKING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "ALL" ? "All statuses" : STATE_LABEL[opt] ?? opt}
                  </option>
                ))}
              </select>
            </div>
            {bookingsLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : bookingsError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {bookingsError}
                <div className="mt-3">
                  <button
                    onClick={() => fetchBookings(bookingFilter)}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                {bookingFilter === "ALL"
                  ? "No bookings yet."
                  : `No ${STATE_LABEL[bookingFilter] ?? bookingFilter} bookings.`}
              </div>
            ) : (() => {
              const PAGE_SIZE = 25;
              const totalPages = Math.ceil(bookings.length / PAGE_SIZE);
              const paged = bookings.slice(bookingPage * PAGE_SIZE, (bookingPage + 1) * PAGE_SIZE);
              return (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                        <th className="px-5 py-2 font-medium">Date</th>
                        <th className="px-5 py-2 font-medium">Club</th>
                        <th className="px-5 py-2 font-medium">Table</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-th-divider/50 last:border-b-0"
                        >
                          <td className="px-5 py-2.5 text-th-text-secondary">
                            {formatDateTime(b.scheduledAt)}
                          </td>
                          <td className="px-5 py-2.5 text-th-text-secondary">{b.clubName}</td>
                          <td className="px-5 py-2.5 text-th-text-secondary">{b.tableLabel}</td>
                          <td className="px-5 py-2.5">
                            <span
                              className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium text-white"
                              style={{
                                backgroundColor: STATE_COLOR[b.status] ?? "#6B6B6B",
                                opacity: b.status === "CANCELLED" ? 0.6 : 1,
                              }}
                              title={b.cancelReason ?? undefined}
                            >
                              {STATE_LABEL[b.status] ?? b.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 font-mono text-th-text-secondary">
                            {formatAED(b.totalFils)}
                            {b.refundedFils !== null && b.refundedFils > 0 && (
                              <div className="text-[10px] text-th-text-tertiary">
                                refunded {formatAED(b.refundedFils)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-th-divider px-5 py-3">
                      <span className="text-xs text-th-text-tertiary">
                        Page {bookingPage + 1} of {totalPages} · {bookings.length} total
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBookingPage((p) => Math.max(0, p - 1))}
                          disabled={bookingPage === 0}
                          className="rounded-button border border-th-divider px-3 py-1 text-xs text-th-text-secondary hover:bg-th-hover disabled:opacity-40"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setBookingPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={bookingPage >= totalPages - 1}
                          className="rounded-button border border-th-divider px-3 py-1 text-xs text-th-text-secondary hover:bg-th-hover disabled:opacity-40"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Recent matches */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Recent Matches</h2>
              <select
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value as MatchResultFilter)}
                className="rounded-input border border-th-divider bg-th-bg px-3 py-1.5 text-xs text-th-text outline-none focus:border-th-gold"
                aria-label="Filter matches by result"
              >
                {RESULT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "ALL" ? "All results" : opt}
                  </option>
                ))}
              </select>
            </div>
            {matchesLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : matchesError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {matchesError}
                <div className="mt-3">
                  <button
                    onClick={() => fetchMatches(matchFilter)}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : matches.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                {matchFilter === "ALL"
                  ? "No matches played yet."
                  : `No ${matchFilter} matches.`}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Opponent</th>
                    <th className="px-5 py-2 font-medium">Game Mode</th>
                    <th className="px-5 py-2 font-medium">Result</th>
                    <th className="px-5 py-2 font-medium">Score</th>
                    <th className="px-5 py-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id} className="border-b border-th-divider/50 last:border-b-0">
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {formatDateTime(m.completedAt)}
                      </td>
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {m.opponentDisplayName ?? "—"}
                      </td>
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {gameModeLabel(m.gameMode)}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: RESULT_COLOR[m.result] }}
                        >
                          {m.result}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-mono text-th-text-secondary">
                        {m.playerScore !== null && m.opponentScore !== null
                          ? `${m.playerScore}–${m.opponentScore}`
                          : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-th-text-secondary">
                        {formatDuration(m.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}

      {/* Ban confirm dialog */}
      {banOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-dialog-title"
          onClick={() => !banSubmitting && setBanOpen(false)}
        >
          <div
            ref={banDialogRef}
            className="w-full max-w-md rounded-card border border-th-divider bg-th-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ban-dialog-title" className="font-display text-lg text-th-text">
              Ban {player?.displayName ?? "player"}?
            </h3>
            <p className="mt-2 text-sm text-th-text-secondary">
              This sets the ban flag globally and cancels their PENDING and CONFIRMED bookings at
              this center. Cancelled bookings are refunded per policy.
            </p>
            <label className="mt-4 block text-xs font-medium text-th-text-secondary">
              Reason (required, min 3 chars)
            </label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              maxLength={500}
              rows={4}
              autoFocus
              className="mt-1 w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              placeholder="e.g., repeated no-shows; harassment of staff"
            />
            <div className="mt-1 flex justify-between text-[10px] text-th-text-tertiary">
              <span>{banReason.trim().length} chars</span>
              <span>500 max</span>
            </div>
            {banError && (
              <p className="mt-2 text-xs text-[#E74C3C]" role="alert">
                {banError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setBanOpen(false)}
                disabled={banSubmitting}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBanSubmit}
                disabled={banSubmitting || banReason.trim().length < 3}
                className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {banSubmitting ? "Banning…" : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban confirm dialog */}
      {unbanOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unban-dialog-title"
          onClick={() => !unbanSubmitting && setUnbanOpen(false)}
        >
          <div
            ref={unbanDialogRef}
            className="w-full max-w-md rounded-card border border-th-divider bg-th-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="unban-dialog-title" className="font-display text-lg text-th-text">
              Restore {player?.displayName ?? "player"}?
            </h3>
            <p className="mt-2 text-sm text-th-text-secondary">
              This clears the active ban immediately. The audit trail remains intact.
            </p>
            {unbanError && (
              <p className="mt-3 text-xs text-[#E74C3C]" role="alert">
                {unbanError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setUnbanOpen(false)}
                disabled={unbanSubmitting}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnban}
                disabled={unbanSubmitting}
                className="rounded-button bg-[#0B3D2E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {unbanSubmitting ? "Restoring…" : "Confirm Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenges drawer */}
      {challengesDir && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenges-drawer-title"
          onClick={closeChallenges}
        >
          <div
            ref={challengesDrawerRef}
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-th-divider bg-th-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="challenges-drawer-title" className="font-display text-lg text-th-text">
                Challenges {challengesDir === "sent" ? "Sent" : "Received"}
              </h3>
              <button
                onClick={closeChallenges}
                aria-label="Close"
                className="text-th-text-tertiary hover:text-th-text"
              >
                ✕
              </button>
            </div>

            {challengesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : challengesError ? (
              <div className="rounded-card border border-th-divider bg-th-bg p-4 text-center text-sm text-[#E74C3C]">
                {challengesError}
                <div className="mt-3">
                  <button
                    onClick={() => openChallenges(challengesDir)}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : challenges.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                No challenges {challengesDir === "sent" ? "sent" : "received"}.
              </div>
            ) : (
              <ul className="space-y-2">
                {challenges.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-card border border-th-divider bg-th-bg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-th-text">{c.opponentDisplayName}</span>
                      <span
                        className="rounded-pill px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{
                          backgroundColor: CHALLENGE_STATUS_COLOR[c.status] ?? "#6B6B6B",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-th-text-tertiary">
                      Sent {formatDateTime(c.sentAt)}
                      {c.respondedAt ? ` · Responded ${formatDateTime(c.respondedAt)}` : ""}
                      {c.gameMode ? ` · ${c.gameMode}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
