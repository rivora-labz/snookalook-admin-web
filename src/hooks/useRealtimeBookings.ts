"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "../lib/realtime";

type BookingEventType = "booking.created" | "booking.cancelled" | "booking.checked_in";

interface BookingEvent {
  type: BookingEventType;
  centerId?: string;
  booking?: { table?: { centerId?: string } };
  bookingId?: string;
}

const EVENTS: BookingEventType[] = ["booking.created", "booking.cancelled", "booking.checked_in"];

/**
 * Subscribe to backend booking lifecycle events for the operator's center
 * (`admin:{centerId}` room). Calls `onInvalidate()` whenever a booking is
 * created, cancelled, or checked-in so the page can refetch the list.
 *
 * Cancellation events do not always carry centerId in payload — the room
 * targeting on the backend already scopes us, so we invalidate on any event
 * received over this socket.
 *
 * Returns silently when realtime is unavailable (dev mode, no WS_URL, no
 * Supabase session) — caller's polling/manual refresh path drives freshness.
 */
export function useRealtimeBookings(centerId: string | null, onInvalidate: () => void) {
  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    let s: Socket | null = null;

    const handler = (_event: BookingEvent) => {
      onInvalidate();
    };

    (async () => {
      s = await connectSocket();
      if (!s || cancelled) return;
      s.emit("join:admin", centerId);
      for (const ev of EVENTS) s.on(ev, handler);
    })();

    return () => {
      cancelled = true;
      if (s) {
        for (const ev of EVENTS) s.off(ev, handler);
        s.emit("leave:center", centerId);
      }
    };
  }, [centerId, onInvalidate]);
}
