import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

type AdminActivityItem = {
  type: "booking" | "cancellation" | "checkin" | "no-show";
  bookingId: string;
  host: { id: string; displayName: string; avatarUrl: string | null };
  table: { id: string; tableNumber: number; type: string };
  state: string;
  startAt: string;
  createdAt: string;
};

const hookState: {
  items: AdminActivityItem[];
  isLoading: boolean;
  error: Error | null;
} = { items: [], isLoading: false, error: null };

vi.mock("../lib/use-admin-activity", () => ({
  useAdminActivity: () => ({
    items: hookState.items,
    isLoading: hookState.isLoading,
    error: hookState.error,
    refresh: () => {},
  }),
  activityText: (a: AdminActivityItem) => `${a.type}-${a.bookingId}`,
  formatRelativeTime: (iso: string) => `rel-${iso}`,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { info: vi.fn() }),
}));

import ActivityStrip from "./ActivityStrip";

const makeItem = (type: AdminActivityItem["type"], id: string): AdminActivityItem => ({
  type,
  bookingId: id,
  host: { id: "h", displayName: "Host", avatarUrl: null },
  table: { id: "t", tableNumber: 1, type: "SNOOKER" },
  state: "OK",
  startAt: "2026-06-01T00:00:00Z",
  createdAt: "2026-06-01T00:00:00Z",
});

describe("ActivityStrip", () => {
  beforeEach(() => {
    hookState.items = [];
    hookState.isLoading = false;
    hookState.error = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("error state renders error message", () => {
    hookState.error = new Error("boom");
    render(<ActivityStrip />);
    expect(screen.getByText(/Couldn't load activity/)).toBeInTheDocument();
  });

  it("loading state renders Loading…", () => {
    hookState.isLoading = true;
    render(<ActivityStrip />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("empty state renders 'No activity yet.'", () => {
    render(<ActivityStrip />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("renders 'Recent activity stream' heading in all non-error states", () => {
    render(<ActivityStrip />);
    expect(screen.getByText("Recent activity stream")).toBeInTheDocument();
    cleanup();
    hookState.isLoading = true;
    render(<ActivityStrip />);
    expect(screen.getByText("Recent activity stream")).toBeInTheDocument();
  });

  it("error state also renders heading", () => {
    hookState.error = new Error("boom");
    render(<ActivityStrip />);
    expect(screen.getByText("Recent activity stream")).toBeInTheDocument();
  });

  it("items render activity text + relative time per item", () => {
    hookState.items = [makeItem("booking", "b1"), makeItem("cancellation", "b2")];
    render(<ActivityStrip />);
    expect(screen.getByText("booking-b1")).toBeInTheDocument();
    expect(screen.getByText("cancellation-b2")).toBeInTheDocument();
    expect(screen.getAllByText("rel-2026-06-01T00:00:00Z").length).toBe(2);
  });

  it("renders an icon SVG per item (4 items → 4 svgs in list)", () => {
    hookState.items = [
      makeItem("booking", "b1"),
      makeItem("cancellation", "b2"),
      makeItem("checkin", "b3"),
      makeItem("no-show", "b4"),
    ];
    const { container } = render(<ActivityStrip />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });

  it("empty state shows credit-card icon hint", () => {
    const { container } = render(<ActivityStrip />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
