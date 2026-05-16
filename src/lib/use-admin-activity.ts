"use client";

import { useEffect, useState } from "react";
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

export function useAdminActivity(limit = 20): UseAdminActivityResult {
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiFetch<AdminActivityResponse>(`/admin/dashboard/activity?limit=${limit}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit, reloadTick]);

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
