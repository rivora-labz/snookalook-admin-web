"use client";

import { ArrowsClockwise } from "phosphor-react";

export default function ErrorRetry({
  message = "Something went wrong",
  onRetry,
  compact = false,
}: {
  message?: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-th-divider bg-th-card px-4 py-3">
        <span className="font-inter text-[13px] text-[#E74C3C]" role="alert">
          {message}
        </span>
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry"
          className="ml-auto inline-flex items-center gap-1.5 rounded-button bg-th-gold px-3 py-1.5 text-[12px] font-medium text-black hover:bg-th-gold-hover transition-colors"
        >
          <ArrowsClockwise size={14} weight="bold" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-card border border-th-divider bg-th-card p-6 text-center"
    >
      <p className="font-inter text-[14px] text-[#E74C3C]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry"
        className="mt-3 inline-flex items-center gap-1.5 rounded-button bg-th-gold px-4 py-2 text-[13px] font-medium text-black hover:bg-th-gold-hover transition-colors"
      >
        <ArrowsClockwise size={16} weight="bold" />
        Retry
      </button>
    </div>
  );
}
