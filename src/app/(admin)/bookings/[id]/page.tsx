"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFocusTrap } from "../../../../lib/use-focus-trap";
import type { Route } from "next";
import type { BookingState } from "@rivora-labz/snook-shared";
import { apiFetch, formatAED, ApiError } from "../../../../lib/api";
import { formatTime, formatDateTime } from "../../../../lib/datetime";

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

interface ChatMessageItem {
  id: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  body: string;
  type: string;
  createdAt: string;
}

interface AuditLogActor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditLogActor | null;
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

function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

  const [messages, setMessages] = useState<ChatMessageItem[] | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);

  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const [isForceOpen, setIsForceOpen] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [forceBusy, setForceBusy] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const forceTitleId = useId();
  const forceDialogRef = useFocusTrap<HTMLDivElement>(isForceOpen, () => {
    if (!forceBusy) setIsForceOpen(false);
  });

  const [isNoShowOpen, setIsNoShowOpen] = useState(false);
  const [noShowParticipant, setNoShowParticipant] = useState<string>("");
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowError, setNoShowError] = useState<string | null>(null);
  const noShowTitleId = useId();
  const noShowDialogRef = useFocusTrap<HTMLDivElement>(isNoShowOpen, () => {
    if (!noShowBusy) setIsNoShowOpen(false);
  });

  const [resendBusy, setResendBusy] = useState(false);

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

  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const resp = await apiFetch<{ items: ChatMessageItem[] }>(
        `/admin/bookings/${bookingId}/messages?limit=20`,
      );
      setMessages(resp.items);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [bookingId]);

  const fetchAuditLog = useCallback(
    async (cursor: string | null = null, append = false) => {
      if (append) setAuditLoadingMore(true);
      else setAuditLoading(true);
      setAuditError(null);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (cursor) qs.set("cursor", cursor);
        const resp = await apiFetch<{ items: AuditLogItem[]; nextCursor: string | null }>(
          `/admin/bookings/${bookingId}/audit-log?${qs.toString()}`,
        );
        setAuditItems((prev) => (append ? [...prev, ...resp.items] : resp.items));
        setAuditCursor(resp.nextCursor);
      } catch (err) {
        setAuditError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        if (append) setAuditLoadingMore(false);
        else setAuditLoading(false);
      }
    },
    [bookingId],
  );

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      fetchPayments();
      fetchMessages();
      fetchAuditLog(null, false);
    }
  }, [bookingId, fetchBooking, fetchPayments, fetchMessages, fetchAuditLog]);

  const totalRefunded = (payments ?? [])
    .filter((p) => p.status === "REFUNDED")
    .reduce((sum, p) => sum + p.amount, 0);

  const openForceCancel = useCallback(() => {
    setForceReason("");
    setForceError(null);
    setIsForceOpen(true);
  }, []);

  const confirmForceCancel = useCallback(async () => {
    if (forceReason.trim().length < 3) {
      setForceError("Please provide a reason (min 3 characters).");
      return;
    }
    setForceBusy(true);
    setForceError(null);
    try {
      await apiFetch(`/admin/bookings/${bookingId}/force-cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: forceReason.trim() }),
      });
      setIsForceOpen(false);
      showToast("Booking force-cancelled and refund issued.", "ok");
      await Promise.all([fetchBooking(), fetchPayments(), fetchAuditLog(null, false)]);
    } catch (err) {
      setForceError(err instanceof Error ? err.message : "Force cancel failed");
    } finally {
      setForceBusy(false);
    }
  }, [bookingId, forceReason, showToast, fetchBooking, fetchPayments, fetchAuditLog]);

  const openNoShow = useCallback(() => {
    if (!booking) return;
    setNoShowParticipant(booking.hostUserId);
    setNoShowError(null);
    setIsNoShowOpen(true);
  }, [booking]);

  const confirmNoShow = useCallback(async () => {
    if (!noShowParticipant) {
      setNoShowError("Select a participant.");
      return;
    }
    setNoShowBusy(true);
    setNoShowError(null);
    try {
      await apiFetch(`/admin/bookings/${bookingId}/no-show`, {
        method: "POST",
        body: JSON.stringify({ participantId: noShowParticipant }),
      });
      setIsNoShowOpen(false);
      showToast("Marked as no-show.", "ok");
      await Promise.all([fetchBooking(), fetchAuditLog(null, false)]);
    } catch (err) {
      setNoShowError(err instanceof Error ? err.message : "No-show failed");
    } finally {
      setNoShowBusy(false);
    }
  }, [bookingId, noShowParticipant, showToast, fetchBooking, fetchAuditLog]);

  const handleResend = useCallback(async () => {
    setResendBusy(true);
    try {
      await apiFetch<{ sent: boolean }>(`/admin/bookings/${bookingId}/resend-confirmation`, {
        method: "POST",
      });
      showToast("Confirmation re-sent.", "ok");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to re-send", "err");
    } finally {
      setResendBusy(false);
    }
  }, [bookingId, showToast]);

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

          {/* Chat snippet */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="flex items-center justify-between border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Chat Snippet</h2>
              <span className="text-xs text-th-text-tertiary">
                {messages ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : ""}
              </span>
            </div>
            {messagesLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : messagesError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {messagesError}
                <div className="mt-3">
                  <button
                    onClick={fetchMessages}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !messages || messages.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                No messages exchanged for this booking.
              </div>
            ) : (
              <ul className="divide-y divide-th-divider">
                {messages.map((m) => {
                  const initial = m.senderDisplayName.charAt(0).toUpperCase();
                  return (
                    <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-th-gold text-xs font-bold text-black">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-th-text">
                            {m.senderDisplayName}
                          </span>
                          <span className="text-[11px] text-th-text-tertiary">
                            {formatDateTime(m.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 break-words text-sm text-th-text-secondary">
                          {m.body}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6">
            <h2 className="mb-4 font-display text-lg text-th-text">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openForceCancel}
                disabled={booking.state === "CANCELLED"}
                className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Force Cancel + Refund
              </button>
              <button
                onClick={openNoShow}
                disabled={booking.state === "CANCELLED" || booking.state === "NO_SHOW" || booking.state === "COMPLETED"}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                Mark No-Show
              </button>
              <button
                onClick={handleResend}
                disabled={resendBusy}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                {resendBusy ? "Sending…" : "Re-send Confirmation"}
              </button>
            </div>
          </div>

          {/* Audit trail */}
          <div className="mb-6 rounded-card border border-th-divider bg-th-card">
            <div className="border-b border-th-divider px-5 py-3">
              <h2 className="font-display text-lg text-th-text">Audit Trail</h2>
            </div>
            {auditLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-th-divider" />
                ))}
              </div>
            ) : auditError ? (
              <div className="p-6 text-center text-sm text-[#E74C3C]">
                {auditError}
                <div className="mt-3">
                  <button
                    onClick={() => fetchAuditLog(null, false)}
                    className="rounded-button bg-th-gold px-4 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : auditItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-th-text-tertiary">
                No audit entries yet.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-th-divider">
                  {auditItems.map((e) => (
                    <li key={e.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-th-text">
                            {formatAuditAction(e.action)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-th-text-tertiary">
                            {e.actor ? e.actor.displayName : "System"} ·{" "}
                            {formatDateTime(e.createdAt)}
                          </div>
                          {e.metadata && Object.keys(e.metadata).length > 0 && (
                            <pre className="mt-2 max-w-full overflow-x-auto rounded bg-th-bg p-2 text-[11px] text-th-text-secondary">
                              {JSON.stringify(e.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {auditCursor && (
                  <div className="border-t border-th-divider p-3 text-center">
                    <button
                      onClick={() => fetchAuditLog(auditCursor, true)}
                      disabled={auditLoadingMore}
                      className="rounded-button border border-th-divider bg-th-bg px-4 py-1.5 text-xs font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
                    >
                      {auditLoadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}

      {/* Force-cancel modal */}
      {isForceOpen && booking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--th-overlay)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={forceTitleId}
        >
          <div ref={forceDialogRef} className="bg-th-card border border-th-divider rounded-2xl p-6 w-full max-w-[440px] shadow-[var(--th-shadow-modal)]">
            <h3 id={forceTitleId} className="font-display text-[18px] font-semibold text-th-text mb-2">
              Force cancel booking?
            </h3>
            <p className="font-inter text-[13px] text-th-text-tertiary mb-4">
              Force cancel bypasses cancellation policy + issues full refund. Continue?
            </p>
            <label className="mb-1 block text-[12px] font-medium text-th-text-secondary">
              Reason (required, min 3 chars)
            </label>
            <textarea
              value={forceReason}
              onChange={(e) => setForceReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Player request, system issue, policy override…"
              className="mb-2 w-full rounded-lg border border-th-divider bg-th-bg px-3 py-2 font-inter text-[13px] text-th-text focus:border-th-gold focus:outline-none"
            />
            {forceError && (
              <div role="alert" className="mb-3 rounded-lg border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-3 py-2 font-inter text-[12px] text-[#E74C3C]">
                {forceError}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setIsForceOpen(false)}
                disabled={forceBusy}
                className="flex-1 h-[40px] border border-th-divider text-th-text hover:bg-th-divider font-inter text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={confirmForceCancel}
                disabled={forceBusy}
                className="flex-1 h-[40px] bg-[#E74C3C] hover:bg-[#C0392B] text-white font-inter text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {forceBusy ? "Cancelling…" : "Force cancel + refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-show modal */}
      {isNoShowOpen && booking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--th-overlay)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={noShowTitleId}
        >
          <div ref={noShowDialogRef} className="bg-th-card border border-th-divider rounded-2xl p-6 w-full max-w-[420px] shadow-[var(--th-shadow-modal)]">
            <h3 id={noShowTitleId} className="font-display text-[18px] font-semibold text-th-text mb-2">
              Mark no-show?
            </h3>
            <p className="font-inter text-[13px] text-th-text-tertiary mb-4">
              Select the participant who didn&apos;t show up.
            </p>
            <div className="mb-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-th-divider bg-th-bg px-3 py-2 text-[13px] text-th-text">
                <input
                  type="radio"
                  name="noShowParticipant"
                  value={booking.hostUserId}
                  checked={noShowParticipant === booking.hostUserId}
                  onChange={(e) => setNoShowParticipant(e.target.value)}
                />
                {booking.host.displayName}
                <span className="ml-auto text-[11px] text-th-text-tertiary">Host</span>
              </label>
              {booking.opponent && booking.opponentUserId && (
                <label className="flex items-center gap-2 rounded-lg border border-th-divider bg-th-bg px-3 py-2 text-[13px] text-th-text">
                  <input
                    type="radio"
                    name="noShowParticipant"
                    value={booking.opponentUserId}
                    checked={noShowParticipant === booking.opponentUserId}
                    onChange={(e) => setNoShowParticipant(e.target.value)}
                  />
                  {booking.opponent.displayName}
                  <span className="ml-auto text-[11px] text-th-text-tertiary">Opponent</span>
                </label>
              )}
            </div>
            {noShowError && (
              <div role="alert" className="mb-3 rounded-lg border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-3 py-2 font-inter text-[12px] text-[#E74C3C]">
                {noShowError}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setIsNoShowOpen(false)}
                disabled={noShowBusy}
                className="flex-1 h-[40px] border border-th-divider text-th-text hover:bg-th-divider font-inter text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={confirmNoShow}
                disabled={noShowBusy}
                className="flex-1 h-[40px] bg-[#E74C3C] hover:bg-[#C0392B] text-white font-inter text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {noShowBusy ? "Marking…" : "Mark no-show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
