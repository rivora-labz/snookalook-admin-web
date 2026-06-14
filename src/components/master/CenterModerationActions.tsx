"use client";

import { useState, useTransition } from "react";
import { suspendCenter, unsuspendCenter } from "../../app/actions/center-moderation";

interface Props {
  centerId: string;
  centerName: string;
  isSuspended: boolean;
  archivedAt: string | null;
}

type ConfirmKind = "suspend" | "unsuspend";

export default function CenterModerationActions({ centerId, centerName, isSuspended, archivedAt }: Props) {
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (archivedAt) return null;

  const open = (kind: ConfirmKind) => {
    setActionError(null);
    setConfirm(kind);
  };

  const close = () => {
    if (!isPending) {
      setConfirm(null);
      setActionError(null);
    }
  };

  const handleConfirm = () => {
    if (!confirm) return;
    setActionError(null);
    startTransition(async () => {
      const result = confirm === "suspend"
        ? await suspendCenter(centerId)
        : await unsuspendCenter(centerId);
      if (result.ok) {
        setConfirm(null);
      } else {
        setActionError(result.message);
      }
    });
  };

  return (
    <>
      {isSuspended ? (
        <button
          onClick={() => open("unsuspend")}
          className="rounded-button border border-[#2ECC71]/40 bg-[#2ECC71]/10 px-4 py-2 font-inter text-[13px] font-medium text-[#2ECC71] hover:bg-[#2ECC71]/20"
        >
          Approve / Unsuspend
        </button>
      ) : (
        <button
          onClick={() => open("suspend")}
          className="rounded-button border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-4 py-2 font-inter text-[13px] font-medium text-[#E74C3C] hover:bg-[#E74C3C]/20"
        >
          Suspend center
        </button>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-card border border-th-divider bg-th-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[18px] font-semibold text-th-text">
              {confirm === "suspend" ? "Suspend center?" : "Approve center?"}
            </h3>
            <p className="mt-2 font-inter text-[13px] text-th-text-secondary">
              {confirm === "suspend"
                ? `Suspending "${centerName}" will prevent new bookings and push CENTER_SUSPENDED to mobile.`
                : `Approving "${centerName}" will restore active status and allow new bookings.`}
            </p>

            {actionError && (
              <p className="mt-3 font-inter text-[12px] text-[#E74C3C]" role="alert">
                {actionError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={close}
                disabled={isPending}
                className="rounded-button border border-th-divider bg-th-bg px-4 py-2 font-inter text-[13px] font-medium text-th-text hover:bg-th-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`rounded-button px-4 py-2 font-inter text-[13px] font-medium text-white disabled:opacity-50 ${
                  confirm === "suspend"
                    ? "bg-[#E74C3C] hover:opacity-90"
                    : "bg-[#2ECC71] hover:opacity-90"
                }`}
              >
                {isPending
                  ? confirm === "suspend" ? "Suspending…" : "Approving…"
                  : confirm === "suspend" ? "Yes, suspend" : "Yes, approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
