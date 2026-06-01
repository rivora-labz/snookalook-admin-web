import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const apiFetchMock = vi.fn();

vi.mock("./api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
}));

import {
  formatRelativeTime,
  activityTypeMeta,
  activityText,
  useAdminActivity,
  type AdminActivityItem,
} from "./use-admin-activity";

const sample = (overrides: Partial<AdminActivityItem> = {}): AdminActivityItem => ({
  type: "booking",
  bookingId: "bk-1",
  host: { id: "h1", displayName: "Alice", avatarUrl: null },
  table: { id: "t1", tableNumber: 4, type: "SNOOKER" },
  state: "CONFIRMED",
  startAt: "2026-06-01T10:00:00Z",
  createdAt: "2026-06-01T09:55:00Z",
  ...overrides,
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("returns 'just now' for <1 minute", () => {
    expect(formatRelativeTime("2026-06-01T11:59:30Z", now)).toBe("just now");
  });

  it("returns Xm ago for 1-59 minutes", () => {
    expect(formatRelativeTime("2026-06-01T11:45:00Z", now)).toBe("15m ago");
  });

  it("returns Xh ago for 1-23 hours", () => {
    expect(formatRelativeTime("2026-06-01T09:00:00Z", now)).toBe("3h ago");
  });

  it("returns 'Yesterday' for exactly 1 day", () => {
    expect(formatRelativeTime("2026-05-31T12:00:00Z", now)).toBe("Yesterday");
  });

  it("returns Xd ago for 2-6 days", () => {
    expect(formatRelativeTime("2026-05-28T12:00:00Z", now)).toBe("4d ago");
  });

  it("returns en-GB day-month label for ≥7 days", () => {
    const out = formatRelativeTime("2026-05-01T12:00:00Z", now);
    expect(out).toMatch(/1 May/);
  });

  it("uses real Date when now arg omitted (no throw)", () => {
    expect(() => formatRelativeTime(new Date().toISOString())).not.toThrow();
  });
});

describe("activityTypeMeta", () => {
  it("cancellation → red FAILURE color", () => {
    expect(activityTypeMeta("cancellation")).toEqual({ color: "#E74C3C", category: "booking" });
  });

  it("checkin → green", () => {
    expect(activityTypeMeta("checkin")).toEqual({ color: "#2ECC71", category: "booking" });
  });

  it("no-show → amber", () => {
    expect(activityTypeMeta("no-show")).toEqual({ color: "#F59E0B", category: "booking" });
  });

  it("booking → blue default", () => {
    expect(activityTypeMeta("booking")).toEqual({ color: "#3498DB", category: "booking" });
  });
});

describe("activityText", () => {
  it("booking → 'X booked Table N'", () => {
    expect(activityText(sample())).toBe("Alice booked Table 4");
  });

  it("cancellation → 'Booking cancelled by X'", () => {
    expect(activityText(sample({ type: "cancellation" }))).toBe("Booking cancelled by Alice");
  });

  it("checkin → 'X checked in at Table N'", () => {
    expect(activityText(sample({ type: "checkin" }))).toBe("Alice checked in at Table 4");
  });

  it("no-show → 'X marked no-show at Table N'", () => {
    expect(activityText(sample({ type: "no-show" }))).toBe("Alice marked no-show at Table 4");
  });

  it("falls back to 'Player' when host missing displayName", () => {
    const item = sample();
    item.host = { id: "h", displayName: "" as unknown as string, avatarUrl: null };
    item.host.displayName = "" as unknown as string;
    // displayName is "" — falsy via ?? requires nullish; "" is not nullish, so this stays ""
    // Instead test by deleting host entirely
    const noHost = { ...sample(), host: undefined as unknown as AdminActivityItem["host"] };
    expect(activityText(noHost)).toBe("Player booked Table 4");
  });

  it("falls back to lowercase 'table' when tableNumber missing", () => {
    const noTable = { ...sample(), table: undefined as unknown as AdminActivityItem["table"] };
    expect(activityText(noTable)).toBe("Alice booked table");
  });
});

describe("useAdminActivity (hook)", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("initial: isLoading=true, items empty", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminActivity());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("apiFetch resolves → items populated, isLoading false, error null", async () => {
    apiFetchMock.mockResolvedValue({ items: [sample()], nextCursor: null });
    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0]!.bookingId).toBe("bk-1");
    expect(result.current.error).toBeNull();
  });

  it("apiFetch rejects → error set, items stay empty, loading false", async () => {
    apiFetchMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.items).toEqual([]);
  });

  it("calls /admin/dashboard/activity?limit=20 by default", async () => {
    apiFetchMock.mockResolvedValue({ items: [], nextCursor: null });
    renderHook(() => useAdminActivity());
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/admin/dashboard/activity?limit=20"));
  });

  it("respects custom limit param", async () => {
    apiFetchMock.mockResolvedValue({ items: [], nextCursor: null });
    renderHook(() => useAdminActivity(5));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/admin/dashboard/activity?limit=5"));
  });
});
