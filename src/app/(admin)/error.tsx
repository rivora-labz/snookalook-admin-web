"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("admin-error", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <h2 className="font-display text-[20px] font-semibold text-th-text">
        Something went wrong on this page
      </h2>
      <p className="font-inter text-[13px] text-th-text-tertiary max-w-md">
        {error.message || "Unexpected error. Try again, or contact support if the issue persists."}
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-th-text-tertiary">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-[#D4AF37] px-4 py-2 font-inter text-[13px] font-semibold text-black hover:bg-[#E8C654] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
