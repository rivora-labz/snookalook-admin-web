"use client";

import { useState } from "react";

export interface NoShowParticipant {
  id: string;
  displayName: string;
  role: "host" | "opponent";
}

export default function NoShowDialog({
  participants,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  participants: NoShowParticipant[];
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (participantId: string, note: string) => void;
}) {
  const [participantId, setParticipantId] = useState(participants[0]?.id ?? "");
  const [note, setNote] = useState("");

  const selected = participants.find((p) => p.id === participantId);
  const isSolo = participants.length === 1;
  const title = isSolo
    ? `Mark ${selected?.displayName ?? "host"} as no-show?`
    : "Mark a participant as no-show?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="noshow-dialog-title"
      onClick={() => !submitting && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-card border border-th-divider bg-th-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="noshow-dialog-title" className="font-display text-lg text-th-text">
          {title}
        </h3>
        <p className="mt-2 text-sm text-th-text-secondary">
          This sets the booking state to NO_SHOW. The action is logged and visible to the
          participant. No refund is issued automatically.
        </p>

        {!isSolo && (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-xs font-medium text-th-text-secondary">Participant</legend>
            {participants.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-button border px-3 py-2 text-sm ${
                  participantId === p.id
                    ? "border-th-gold bg-th-gold/10 text-th-text"
                    : "border-th-divider bg-th-bg text-th-text-secondary hover:bg-th-hover"
                }`}
              >
                <input
                  type="radio"
                  name="participantId"
                  value={p.id}
                  checked={participantId === p.id}
                  onChange={() => setParticipantId(p.id)}
                  className="accent-[var(--th-gold)]"
                />
                <span className="flex-1">{p.displayName}</span>
                <span className="text-[10px] uppercase text-th-text-tertiary">{p.role}</span>
              </label>
            ))}
          </fieldset>
        )}

        <label className="mt-4 block text-xs font-medium text-th-text-secondary">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
          placeholder="e.g., guest didn't show, table was held 15 minutes"
        />

        {error && (
          <p className="mt-2 text-xs text-[#E74C3C]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-button border border-th-divider bg-th-bg px-4 py-2 text-sm font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(participantId, note.trim())}
            disabled={submitting || !participantId}
            className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Marking…" : "Confirm No-Show"}
          </button>
        </div>
      </div>
    </div>
  );
}
