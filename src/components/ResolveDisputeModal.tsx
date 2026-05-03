"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError, formatAED } from "../lib/api";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DisputeRecord {
  id: string;
  bookingId: string;
  reason: string;
  openedAt: string;
  openedBy: { id: string; displayName: string };
  hostUserId: string;
  opponentUserId: string | null;
  stakeFils: number;
  startAt: string;
}

interface Props {
  open: boolean;
  dispute: DisputeRecord | null;
  onClose: () => void;
  onResolved: () => void;
}

type ActionKey = "CONFIRM_REPORTED" | "FLIP_WINNER" | "DISMISS";

export default function ResolveDisputeModal({ open, dispute, onClose, onResolved }: Props) {
  const [action, setAction] = useState<ActionKey | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointGap, setEndpointGap] = useState(false);
  const [opponentMissing, setOpponentMissing] = useState(false);
  const [outcomeMsg, setOutcomeMsg] = useState("");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setAction(null);
    setAdminNote("");
    setSubmitting(false);
    setError(null);
    setEndpointGap(false);
    setOpponentMissing(false);
    setOutcomeMsg("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const focusables = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    focusables[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const list = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !dispute) return null;

  const otherParticipantId =
    dispute.openedBy.id === dispute.hostUserId
      ? dispute.opponentUserId
      : dispute.hostUserId;

  const submit = async (chosen: ActionKey) => {
    setError(null);
    setEndpointGap(false);
    setOpponentMissing(false);

    if (!adminNote.trim()) {
      setError("Admin note required.");
      return;
    }

    let outcome: "RESOLVED" | "REJECTED";
    let resolvedWinnerUserId: string | null;

    if (chosen === "CONFIRM_REPORTED") {
      outcome = "RESOLVED";
      resolvedWinnerUserId = dispute.openedBy.id;
    } else if (chosen === "FLIP_WINNER") {
      if (!otherParticipantId) {
        setOpponentMissing(true);
        return;
      }
      outcome = "RESOLVED";
      resolvedWinnerUserId = otherParticipantId;
    } else {
      outcome = "REJECTED";
      resolvedWinnerUserId = null;
    }

    setAction(chosen);
    setSubmitting(true);
    try {
      await apiFetch(`/admin/matches/${dispute.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          resolvedWinnerUserId,
          resolution: adminNote.trim().slice(0, 500),
        }),
      });
      const stakeLabel = dispute.stakeFils > 0 ? formatAED(dispute.stakeFils) : "no stake";
      const msg =
        chosen === "CONFIRM_REPORTED"
          ? `Dispute resolved. Winner: ${dispute.openedBy.displayName}. Stake ${stakeLabel}.`
          : chosen === "FLIP_WINNER"
            ? `Dispute resolved. Winner: opponent. Stake ${stakeLabel}.`
            : `Dispute dismissed. Refund of ${stakeLabel} issued.`;
      setOutcomeMsg(msg);
      onResolved();
      // Brief delay so screen readers announce the live region before unmount.
      window.setTimeout(onClose, 250);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setEndpointGap(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to resolve dispute.");
      }
    } finally {
      setSubmitting(false);
      setAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-dispute-title"
        aria-describedby="resolve-dispute-summary"
        className="relative my-8 w-full max-w-lg rounded-card border border-th-divider bg-th-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div role="status" aria-live="polite" className="sr-only">
          {outcomeMsg}
        </div>
        <div className="mb-4 flex items-start justify-between">
          <h2 id="resolve-dispute-title" className="font-display text-xl text-th-text">
            Resolve dispute
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-th-text-tertiary hover:text-th-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <section
          id="resolve-dispute-summary"
          className="mb-4 rounded-button border border-th-divider bg-th-bg p-3 text-xs text-th-text-secondary"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-th-text-tertiary">Booking</div>
              <div className="font-mono text-th-text">{dispute.bookingId.slice(0, 8)}</div>
            </div>
            <div>
              <div className="text-th-text-tertiary">Stake</div>
              <div className="font-mono text-th-text">
                {dispute.stakeFils > 0 ? formatAED(dispute.stakeFils) : "—"}
              </div>
            </div>
            <div>
              <div className="text-th-text-tertiary">Reported by</div>
              <div className="text-th-text">{dispute.openedBy.displayName}</div>
            </div>
            <div>
              <div className="text-th-text-tertiary">Reported at</div>
              <div className="text-th-text">{new Date(dispute.openedAt).toLocaleString("en-GB")}</div>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-th-text-tertiary">Reason</div>
          <p className="rounded-button border border-th-divider bg-th-bg p-3 text-sm text-th-text">
            {dispute.reason || <span className="text-th-text-tertiary">No reason provided.</span>}
          </p>
        </section>

        <label className="mb-4 flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-th-text-tertiary">
            Admin note (required)
          </span>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Briefly justify the resolution. Stored on the dispute record."
            className="rounded-button border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
          />
          <span className="text-right text-[10px] text-th-text-tertiary">
            {adminNote.length}/500
          </span>
        </label>

        {endpointGap && (
          <div className="mb-3 rounded-button border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-xs text-[#F39C12]">
            Backend <code>POST /v1/admin/matches/:id/resolve</code> returned 404/405. Founder gap.
          </div>
        )}

        {opponentMissing && (
          <div className="mb-3 rounded-button border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-xs text-[#F39C12]">
            Cannot flip winner — booking has no opponent on record.
          </div>
        )}

        {error && <p className="mb-3 text-xs text-[#E74C3C]">{error}</p>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ActionButton
            disabled={submitting}
            busy={submitting && action === "CONFIRM_REPORTED"}
            tone="green"
            onClick={() => submit("CONFIRM_REPORTED")}
            label="Confirm reporter"
            sub={`Winner: ${dispute.openedBy.displayName}`}
          />
          <ActionButton
            disabled={submitting || !otherParticipantId}
            busy={submitting && action === "FLIP_WINNER"}
            tone="amber"
            onClick={() => submit("FLIP_WINNER")}
            label="Flip winner"
            sub={otherParticipantId ? "Award the opponent" : "No opponent"}
          />
          <ActionButton
            disabled={submitting}
            busy={submitting && action === "DISMISS"}
            tone="neutral"
            onClick={() => submit("DISMISS")}
            label="Dismiss"
            sub="Reject + refund"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:text-th-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  disabled: boolean;
  busy: boolean;
  tone: "green" | "amber" | "neutral";
  onClick: () => void;
  label: string;
  sub: string;
}

function ActionButton({ disabled, busy, tone, onClick, label, sub }: ActionButtonProps) {
  const toneClass =
    tone === "green"
      ? "border-[#2ECC71]/40 hover:bg-[#2ECC71]/10 text-[#2ECC71]"
      : tone === "amber"
        ? "border-[#F39C12]/40 hover:bg-[#F39C12]/10 text-[#F39C12]"
        : "border-th-divider hover:bg-th-hover text-th-text-secondary";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded-button border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${toneClass}`}
    >
      <span className="font-medium">{busy ? "Submitting…" : label}</span>
      <span className="text-[10px] opacity-80">{sub}</span>
    </button>
  );
}
