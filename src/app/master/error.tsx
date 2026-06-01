"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

function isStaleServerAction(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes("Server Action") && message.includes("not found");
}

export default function MasterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleServerAction(error.message);

  useEffect(() => {
    if (stale && typeof window !== "undefined") {
      const reloadKey = `__sa_reload_${error.digest ?? "nodigest"}`;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        return;
      }
    }
    Sentry.captureException(error, { tags: { boundary: "master-error" } });
  }, [error, stale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <h2 className="font-display text-[20px] font-semibold text-th-text">
        {stale ? "Page outdated. Refreshing…" : "Something went wrong on this page"}
      </h2>
      <p className="font-inter text-[13px] text-th-text-tertiary max-w-md">
        {stale
          ? "A newer version was deployed. Reloading to sync."
          : error.message || "Unexpected error. Try again, or contact support if the issue persists."}
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
