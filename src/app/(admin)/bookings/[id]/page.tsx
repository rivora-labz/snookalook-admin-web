"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import type { BookingState } from "@rivora-labz/snook-shared/enums";
import { apiFetch, formatAED, formatDate, ApiError } from "../../../../lib/api";

interface BookingDetail {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  state: BookingState;
  totalAmount: number;
  matchMode: string;
  hostUserId: string;
  opponentUserId: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  host: { id: string; displayName: string; avatarUrl: string | null };
  opponent?: { id: string; displayName: string; avatarUrl: string | null } | null;
  table: {
    id: string;
    tableNumber: number;
    type: string;
    center?: { id: string; name: string; address: string } | null;
  };
  payment: { id: string; amount: number; status: string; method: string } | null;
}

interface PaymentItem {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
  method: string;
  providerReference: string | null;
  createdAt: string;
  capturedAt: string | null;
}

const STATE_COLOR: Record<string, string> = {
  PENDING: "#F39C12",
  CONFIRMED: "#0B3D2E",
  CHECKED_IN: "#3498DB",
  IN_PLAY: "#3498DB",
  COMPLETED: "#0B3D2E",
  CANCELLED: "#6B6B6B",
  NO_SHOW: "#E74C3C",
  DISPUTED: "#E74C3C",
};

const STATE_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_PLAY: "In Play",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  DISPUTED: "Disputed",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  CAPTURED: "#2ECC71",
  AUTHORIZED: "#2ECC71",
  PENDING: "#F39C12",
  FAILED: "#E74C3C",
  REFUNDED: "#3498DB",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  CAPTURED: "Completed",
  AUTHORIZED: "Authorized",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function StatusPill({ state }: { state: string }) {
  return (
    <span
      className="inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium text-white"
      style={{
        backgroundColor: STATE_COLOR[state] ?? "#6B6B6B",
        opacity: state === "CANCELLED" ? 0.7 : 1,
      }}
    >
      {STATE_LABEL[state] ?? state}
    </span>
  );
}

function ParticipantChip({
  id,
  displayName,
  onClick,
}: {
  id: string;
  displayName: string;
  onClick: () => void;
}) {
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-button border border-th-divider bg-th-bg px-3 py-1.5 text-sm text-th-text hover:bg-th-hover"
      title={`View player ${id}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-th-gold text-xs font-bold text-black">
        {initial}
      </span>
      {displayName}
    </button>
  );
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params?.id ?? "";

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payments, setPayments] = useState<PaymentItem[] | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await apiFetch<BookingDetail>(`/admin/bookings/${bookingId}`);
      setBooking(detail);
      setNotFound(false);
      setError(null);
    } catch (err) {
      // Fallback: endpoint may not exist yet (404 NOT_FOUND or 404 from missing route).
      // Try wide-range list and filter client-side.
      if (err instanceof ApiError && (err.status === 404 || err.code === "NOT_FOUND")) {
        try {
          const now = new Date();
          const from = new Date(now.getTime() - 365 * 24 * 3600_000).toISOString();
          const to = new Date(now.getTime() + 365 * 24 * 3600_000).toISOString();
          const list = await apiFetch<{ items: BookingDetail[] }>(
            `/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`,
          );
          const found = list.items.find((b) => b.id === bookingId);
          if (found) {
            setBooking(found);
            setNotFound(false);
            setError(null);
          } else {
            setNotFound(true);
            setBooking(null);
          }
        } catch (fallbackErr) {
          setError(
            fallbackErr instanceof Error ? fallbackErr.message : "Failed to load booking",
          );
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to load booking");
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      // No /admin/bookings/:id/payments endpoint yet — pull recent admin payments
      // for this center and filter client-side. This covers the common case
      // (recent disputes); old bookings may need backend follow-on.
      const resp = await apiFetch<{ items: Array<PaymentItem & { booking: { id: string } }> }>(
        `/admin/payments?limit=100`,
      );
      const matching = resp.items
        .filter((p) => p.booking.id === bookingId)
        .map(({ booking: _b, ...rest }) => rest);
      setPayments(matching);
    } catch (err) {
      setPaymentsError(err instanceof Error ? err.message : "Failed to load payments");
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      fetchPayments();
    }
  }, [bookingId, fetchBooking, fetchPayments]);

  const totalRefunded = (payments ?? [])
    .filter((p) => p.status === "REFUNDED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <header className="mb-6">
        <button
          onClick={() => router.push("/bookings" as Route)}
          className="mb-2 text-sm text-th-text-tertiary hover:text-th-text"
        >
          ← Back to Bookings
        </button>
        <h1 className="font-display text-3xl text-th-text">Booking Detail</h1>
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
          <p className="text-th-text">Booking not found.</p>
          <p className="mt-1 text-sm text-th-text-tertiary">
            Either the ID is invalid or the booking is outside the accessible window.
          </p>
          <button
            onClick={() => router.push("/bookings" as Route)}
            className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Back to Bookings
          </button>
        </div>
      )}

      {error && !notFound && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={fetchBooking}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !notFound ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-card bg-th-card" />
          <div className="h-24 animate-pulse rounded-card bg-th-card" />
          <div className="h-40 animate-pulse rounded-card bg-th-card" />
        </div>
      ) : booking ? (
        <>
          {/* Header summary */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <StatusPill state={booking.state} />
                  <span className="text-xs text-th-text-tertiary">#{booking.id.slice(0, 8)}</span>
                </div>
                <div className="mt-3 text-lg text-th-text">
                  {formatDateTime(booking.startAt)}
                  <span className="ml-2 text-th-text-tertiary">
                    → {formatTime(booking.endAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-th-text-tertiary">
                  {booking.durationMinutes / 60}h · {booking.matchMode.replace("_", " ")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-th-text-tertiary">Total</div>
                <div className="font-mono text-2xl text-th-text">
                  {formatAED(booking.totalAmount)}
                </div>
                {totalRefunded > 0 && (
                  <div className="mt-0.5 text-xs text-[#3498DB]">
                    refunded {formatAED(totalRefunded)}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-th-text-tertiary">Club</div>
                <div className="mt-0.5 text-sm text-th-text">
                  {booking.table.center?.name ?? "—"}
                </div>
                {booking.table.center?.address && (
                  <div className="text-[11px] text-th-text-tertiary">
                    {booking.table.center.address}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-th-text-tertiary">Table</div>
                <div className="mt-0.5 text-sm text-th-text">
                  <span className="font-mono">#{booking.table.tableNumber}</span>{" "}
                  <span className="text-th-text-tertiary">{booking.table.type}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs text-th-text-tertiary">Participants</div>
              <div className="flex flex-wrap gap-2">
                <ParticipantChip
                  id={booking.host.id}
                  displayName={booking.host.displayName}
                  onClick={() => router.push(`/players/${booking.host.id}` as Route)}
                />
                {booking.opponent && (
                  <ParticipantChip
                    id={booking.opponent.id}
                    displayName={booking.opponent.displayName}
                    onClick={() => router.push(`/players/${booking.opponent!.id}` as Route)}
                  />
                )}
                {!booking.opponent && booking.opponentUserId === null && (
                  <span className="text-xs text-th-text-tertiary">Solo booking</span>
                )}
              </div>
            </div>
          </div>

          {/* Payment timeline */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Payment Timeline</h2>
            </div>
            {paymentsLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : paymentsError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {paymentsError}
                <div className="mt-3">
                  <button
                    onClick={fetchPayments}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !payments || payments.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                No payment records found for this booking.
                <div className="mt-2 text-[11px] text-th-text-tertiary/80">
                  (Searched recent 100 payments — old bookings may need direct lookup once
                  /admin/bookings/:id/payments lands.)
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-th-divider">
                {payments.map((p) => {
                  const stripeUrl =
                    p.method === "STRIPE" && p.providerReference
                      ? `https://dashboard.stripe.com/payments/${p.providerReference}`
                      : null;
                  return (
                    <li key={p.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block rounded-pill px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{
                              backgroundColor: PAYMENT_STATUS_COLOR[p.status] ?? "#6B6B6B",
                            }}
                          >
                            {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                          <span className="text-sm text-th-text-secondary">
                            {p.method.replace("_", " ")}
                          </span>
                        </div>
                        <span className="font-mono text-sm text-th-text">
                          {formatAED(p.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-th-text-tertiary">
                        <span>Created {formatDateTime(p.createdAt)}</span>
                        {p.capturedAt && <span>Captured {formatDateTime(p.capturedAt)}</span>}
                        {stripeUrl && (
                          <a
                            href={stripeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-th-gold hover:underline"
                          >
                            Stripe ↗
                          </a>
                        )}
                        {p.providerReference && !stripeUrl && (
                          <span className="font-mono">{p.providerReference}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Chat snippet — TODO: backend endpoint */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="flex items-center justify-between border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Chat Snippet</h2>
            </div>
            <div className="border border-dashed border-[#F39C12]/40 bg-[#F39C12]/5 p-5 text-sm text-th-text-secondary">
              <div className="font-medium text-[#F39C12]">Backend gap</div>
              <div className="mt-1">
                No <code className="font-mono">GET /v1/admin/bookings/:id/messages</code> endpoint
                exists yet. The user-scoped chat route at <code className="font-mono">/v1/chat</code>{" "}
                cannot be reused (admin acts as a third party). Backlog: scoped admin
                read-only endpoint with the last N messages by bookingId.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
            <h2 className="mb-4 font-display text-lg text-th-text">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  showToast(
                    "Force cancel + refund — placeholder. Backend POST /admin/bookings/:id/cancel exists; wire-up pending follow-on brief.",
                    "ok",
                  )
                }
                disabled={booking.state === "CANCELLED"}
                className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Force Cancel + Refund
              </button>
              <button
                onClick={() =>
                  showToast(
                    "Mark no-show — placeholder. Backend brief pending.",
                    "ok",
                  )
                }
                disabled={booking.state === "CANCELLED" || booking.state === "NO_SHOW"}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                Mark No-Show
              </button>
              <button
                onClick={() =>
                  showToast(
                    "Re-send confirmation — placeholder. Backend brief pending.",
                    "ok",
                  )
                }
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover"
              >
                Re-send Confirmation
              </button>
            </div>
          </div>

          {/* Audit trail — TODO: backend AuditLog model */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Audit Trail</h2>
            </div>
            <div className="border border-dashed border-[#F39C12]/40 bg-[#F39C12]/5 p-5 text-sm text-th-text-secondary">
              <div className="font-medium text-[#F39C12]">Backend gap</div>
              <div className="mt-1">
                <code className="font-mono">AuditLog</code> model not implemented yet (per
                backlog brief D). Once seeded, this section will list reschedules, status
                changes, and admin overrides with actor + timestamp.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
