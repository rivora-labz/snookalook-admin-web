import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, waitFor } from "@testing-library/react";

type BookingItem = {
  startAt: string;
  state: string;
  host: { displayName: string; avatarUrl: string | null };
  table: { tableNumber: number | string } | null;
};

const apiFetchMock = vi.fn<(path: string) => Promise<{ items: BookingItem[] }>>();

vi.mock("../lib/api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
}));

vi.mock("../lib/datetime", () => ({
  formatTime: (s: string) => `T:${s}`,
}));

vi.mock("./PlayerAvatar", () => ({
  default: ({ name }: { name: string }) => <span data-testid="avatar" data-name={name} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import SchedulePanel from "./SchedulePanel";

describe("SchedulePanel", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading skeleton initially (before first fetch resolves)", () => {
    apiFetchMock.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<SchedulePanel />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders title after load", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    expect(await screen.findByText("Today's Schedule")).toBeInTheDocument();
  });

  it("shows empty-state when no bookings", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    expect(await screen.findByText("No upcoming bookings.")).toBeInTheDocument();
  });

  it("renders booking with time, name, and table", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          startAt: "2026-06-01T10:00:00Z",
          state: "CONFIRMED",
          host: { displayName: "Alice", avatarUrl: null },
          table: { tableNumber: 3 },
        },
      ],
    });
    render(<SchedulePanel />);
    expect(await screen.findByText("T:2026-06-01T10:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("CONFIRMED status renders gold dot with title=Confirmed", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          startAt: "x",
          state: "CONFIRMED",
          host: { displayName: "Bob", avatarUrl: null },
          table: { tableNumber: 1 },
        },
      ],
    });
    render(<SchedulePanel />);
    await screen.findByText("Bob");
    expect(screen.getByTitle("Confirmed")).toBeInTheDocument();
  });

  it("non-CONFIRMED state maps to PENDING dot", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          startAt: "x",
          state: "REQUESTED",
          host: { displayName: "Carol", avatarUrl: null },
          table: { tableNumber: 2 },
        },
      ],
    });
    render(<SchedulePanel />);
    await screen.findByText("Carol");
    expect(screen.getByTitle("Pending")).toBeInTheDocument();
  });

  it("falls back to '--' when table.tableNumber missing", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          startAt: "x",
          state: "CONFIRMED",
          host: { displayName: "Dan", avatarUrl: null },
          table: null,
        },
      ],
    });
    render(<SchedulePanel />);
    await screen.findByText("Dan");
    expect(screen.getByText("Table --")).toBeInTheDocument();
  });

  it("limits render to first 8 items via slice", async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      startAt: `t${i}`,
      state: "CONFIRMED",
      host: { displayName: `User${i}`, avatarUrl: null },
      table: { tableNumber: i + 1 },
    }));
    apiFetchMock.mockResolvedValue({ items });
    render(<SchedulePanel />);
    await screen.findByText("User0");
    expect(screen.getByText("User7")).toBeInTheDocument();
    expect(screen.queryByText("User8")).not.toBeInTheDocument();
    expect(screen.queryByText("User11")).not.toBeInTheDocument();
  });

  it("renders 'View full calendar →' link to /bookings", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    const link = await screen.findByText("View full calendar →");
    expect(link.closest("a")?.getAttribute("href")).toBe("/bookings");
  });

  it("fetch rejection is swallowed — loading clears + empty state shown", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiFetchMock.mockRejectedValue(new Error("network"));
    render(<SchedulePanel />);
    await waitFor(() =>
      expect(screen.getByText("No upcoming bookings.")).toBeInTheDocument(),
    );
    errSpy.mockRestore();
  });

  it("calls apiFetch with today range", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    await screen.findByText("Today's Schedule");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/bookings?from=today&to=today");
  });
});
