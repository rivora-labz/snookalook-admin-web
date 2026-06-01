"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "../lib/realtime";

interface TableEvent {
  centerId: string;
  table?: { id: string; centerId: string; status: string };
  tableId?: string;
}

/**
 * Subscribe to backend table realtime events for the given center. Calls
 * `onInvalidate()` on table.updated / table.created / table.deleted so the
 * caller can refetch the enriched `/admin/tables` view (Socket.IO payloads
 * only carry base Table; the admin grid needs `currentBooking` join too).
 *
 * Returns silently when realtime is unavailable (dev mode, no WS_URL, no
 * session) — caller's polling fallback continues to drive freshness.
 */
export function useRealtimeTables(centerId: string | null, onInvalidate: () => void) {
  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    let s: Socket | null = null;

    const handler = (event: TableEvent) => {
      if (event.centerId === centerId) onInvalidate();
    };

    (async () => {
      s = await connectSocket();
      if (!s || cancelled) return;
      s.emit("join:admin", centerId);
      s.on("table.updated", handler);
      s.on("table.created", handler);
      s.on("table.deleted", handler);
    })();

    return () => {
      cancelled = true;
      if (s) {
        s.off("table.updated", handler);
        s.off("table.created", handler);
        s.off("table.deleted", handler);
        s.emit("leave:center", centerId);
      }
    };
  }, [centerId, onInvalidate]);
}
