import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("../lib/datetime", () => ({
  formatTime: (ts: string) => `T:${ts}`,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

vi.mock("./PlayerAvatar", () => ({
  default: ({ name }: { name: string }) =>
    React.createElement("span", { "data-testid": "avatar" }, name),
}));

import SchedulePanel from "./SchedulePanel";

const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  startAt: "2026-06-01T10:00:00Z",
  host: { displayName: "Alice", avatarUrl: null },
  table: { tableNumber: 3 },
  state: "CONFIRMED",
  ...overrides,
});

beforeEach(() => {
  apiFetchMock.mockClear();
});

describe("SchedulePanel", () => {
  it("shows loading skeleton while fetching", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SchedulePanel />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows heading after load", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getByText("Today's Schedule")).toBeTruthy());
  });

  it("shows empty state when no bookings", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getByText("No upcoming bookings.")).toBeTruthy());
  });

  it("renders slot name", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking()] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1));
  });

  it("renders table number", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking()] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getByText("Table 3")).toBeTruthy());
  });

  it("renders formatTime result", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking()] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getByText("T:2026-06-01T10:00:00Z")).toBeTruthy());
  });

  it("renders PENDING status indicator for non-CONFIRMED bookings", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking({ state: "PENDING" })] });
    const { container } = render(<SchedulePanel />);
    await waitFor(() => expect(container.querySelector("[title='Pending']")).toBeTruthy());
  });

  it("renders CONFIRMED status indicator", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking({ state: "CONFIRMED" })] });
    const { container } = render(<SchedulePanel />);
    await waitFor(() => expect(container.querySelector("[title='Confirmed']")).toBeTruthy());
  });

  it("table fallback -- when tableNumber missing", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeBooking({ table: null })] });
    render(<SchedulePanel />);
    await waitFor(() => expect(screen.getByText("Table --")).toBeTruthy());
  });

  it("renders View full calendar link", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    const { container } = render(<SchedulePanel />);
    await waitFor(() => {
      const link = container.querySelector("a[href='/bookings']");
      expect(link).toBeTruthy();
    });
  });

  it("caps rendered slots at 8", async () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      makeBooking({ host: { displayName: `Player ${i}`, avatarUrl: null } }),
    );
    apiFetchMock.mockResolvedValue({ items });
    render(<SchedulePanel />);
    await waitFor(() => {
      const avatars = screen.getAllByTestId("avatar");
      expect(avatars.length).toBe(8);
    });
  });
});
