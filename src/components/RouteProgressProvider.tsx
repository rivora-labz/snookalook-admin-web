"use client";

import { ProgressProvider } from "@bprogress/next/app";

export function RouteProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="#D4AF37"
      options={{ showSpinner: false, trickleSpeed: 120, minimum: 0.12 }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
}
