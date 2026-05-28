"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";

export interface AdminActivityItem {
  type: "booking" | "cancellation" | "checkin" | "no-show";
  bookingId: string;
  host: { id: string; displayName: string; avatarUrl: string | null };
  table: { id: string; tableNumber: number; type: string };
  state: string;
  startAt: string;
  createdAt: string;
}

interface AdminActivityResponse {
  items: AdminActivityItem[];
  nextCursor: string | null;
}

export interface UseAdminActivityResult {
  items: AdminActivityItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export interface UseAdminActivityOptions {
  pollMs?: number;
  onNewItems?: (newItems: AdminActivityItem[]) => void;
}

export function useAdminActivity(
  limit = 20,
  opts: UseAdminActivityOptions = {},
): UseAdminActivityResult {
  const { pollMs, onNewItems } = opts;
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const onNewItemsRef = useRef(onNewItems);
  onNewItemsRef.current = onNewItems;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFirstLoad = items.length === 0 && seenIdsRef.current.size === 0;

    const tick = async () => {
      if (cancelled) return;
      if (isFirstLoad) setIsLoading(true);
      try {
        const res = await apiFetch<AdminActivityResponse>(
          `/admin/dashboard/activity?limit=${limit}`,
        );
        if (cancelled) return;
        const fresh = res.items;
        if (!isFirstLoad && onNewItemsRef.current) {
          const seen = seenIdsRef.current;
          const newOnes = fresh.filter((i) => !seen.has(`${i.type}:${i.bookingId}`));
          if (newOnes.length > 0) onNewItemsRef.current(newOnes);
        }
        seenIdsRef.current = new Set(fresh.map((i) => `${i.type}:${i.bookingId}`));
        setItems(fresh);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (cancelled) return;
        if (isFirstLoad) setIsLoading(false);
        isFirstLoad = false;
        if (pollMs && pollMs > 0) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, reloadTick, pollMs]);

  return { items, isLoading, error, refresh: () => setReloadTick((t) => t + 1) };
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function activityTypeMeta(type: AdminActivityItem["type"]): {
  color: string;
  category: "booking" | "player" | "payment";
} {
  switch (type) {
    case "cancellation":
      return { color: "#E74C3C", category: "booking" };
    case "checkin":
      return { color: "#2ECC71", category: "booking" };
    case "no-show":
      return { color: "#F59E0B", category: "booking" };
    case "booking":
    default:
      return { color: "#3498DB", category: "booking" };
  }
}

export function activityText(item: AdminActivityItem): string {
  const player = item.host?.displayName ?? "Player";
  const tableNum = item.table?.tableNumber;
  const tableLabel = tableNum != null ? `Table ${tableNum}` : "table";
  switch (item.type) {
    case "cancellation":
      return `Booking cancelled by ${player}`;
    case "checkin":
      return `${player} checked in at ${tableLabel}`;
    case "no-show":
      return `${player} marked no-show at ${tableLabel}`;
    case "booking":
    default:
      return `${player} booked ${tableLabel}`;
  }
}
