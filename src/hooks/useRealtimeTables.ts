"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "../lib/realtime";

interface TableUpdatedEvent {
  type: "table.updated";
  centerId: string;
  table: { id: string; centerId: string; status: string };
}

/**
 * Subscribe to backend `table.updated` events for the given center. Calls
 * `onInvalidate()` whenever a table change lands so the caller can refetch
 * the enriched `/admin/tables` view (Socket.IO payload only carries the base
 * Table; the admin grid needs `currentBooking` join too).
 *
 * Returns silently when realtime is unavailable (dev mode, no WS_URL, no
 * session) — caller's polling fallback continues to drive freshness.
 */
export function useRealtimeTables(centerId: string | null, onInvalidate: () => void) {
  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    let s: Socket | null = null;

    const handler = (event: TableUpdatedEvent) => {
      if (event.centerId === centerId) onInvalidate();
    };

    (async () => {
      s = await connectSocket();
      if (!s || cancelled) return;
      s.emit("join:admin", centerId);
      s.on("table.updated", handler);
    })();

    return () => {
      cancelled = true;
      if (s) {
        s.off("table.updated", handler);
        s.emit("leave:center", centerId);
      }
    };
  }, [centerId, onInvalidate]);
}
