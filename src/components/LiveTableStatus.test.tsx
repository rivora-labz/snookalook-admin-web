import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup, screen, waitFor } from "@testing-library/react";

const apiFetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();

vi.mock("../lib/api", () => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  }
  return {
    apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
    ApiError,
  };
});

vi.mock("../hooks/useRealtimeTables", () => ({
  useRealtimeTables: () => {},
}));

vi.mock("../lib/active-center", () => ({
  useActiveCenterId: () => null,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

import LiveTableStatus from "./LiveTableStatus";

const inPlayBooking = (endAt: string) => ({
  id: "bk-1",
  host: { displayName: "Alice Host", avatarUrl: null },
  endAt,
});

const tablesPayload = (now: number) => ({
  items: [
    { id: "t1", tableNumber: 1, type: "SNOOKER", status: "AVAILABLE" as const, currentBooking: null },
    {
      id: "t2",
      tableNumber: 3,
      type: "POOL",
      status: "IN_PLAY" as const,
      currentBooking: inPlayBooking(new Date(now + 25 * 60 * 1000).toISOString()),
    },
    { id: "t3", tableNumber: 7, type: "SNOOKER", status: "RESERVED" as const, currentBooking: null },
    { id: "t4", tableNumber: 9, type: "BILLIARDS", status: "MAINTENANCE" as const, currentBooking: null },
  ],
});

describe("LiveTableStatus", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders loading skeleton (12 placeholder cards) initially", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<LiveTableStatus />);
    const skeletons = container.querySelectorAll(".animate-pulse > div");
    expect(skeletons.length).toBe(12);
  });

  it("renders heading + legend after fetch resolves", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText("Live Table Status")).toBeInTheDocument());
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("In Use")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
    expect(screen.getByText("Maint.")).toBeInTheDocument();
  });

  it("renders padded table numbers (2-digit zero pad)", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeInTheDocument());
    expect(screen.getByText("Table 03")).toBeInTheDocument();
    expect(screen.getByText("Table 07")).toBeInTheDocument();
    expect(screen.getByText("Table 09")).toBeInTheDocument();
  });

  it("renders type label per table", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeInTheDocument());
    expect(screen.getAllByText("SNOOKER").length).toBe(2);
    expect(screen.getByText("POOL")).toBeInTheDocument();
    expect(screen.getByText("BILLIARDS")).toBeInTheDocument();
  });

  it("IN_PLAY: renders host displayName + 'Xm remaining'", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText("Alice Host")).toBeInTheDocument());
    expect(screen.getByText("25m remaining")).toBeInTheDocument();
  });

  it("RESERVED: renders RESERVED badge", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText("RESERVED")).toBeInTheDocument());
  });

  it("AVAILABLE: renders hidden 'Book Now →' affordance", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    render(<LiveTableStatus />);
    await waitFor(() => expect(screen.getByText(/Book Now/)).toBeInTheDocument());
  });

  it("MAINTENANCE: card has grayscale + opacity-60 classes", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    const { container } = render(<LiveTableStatus />);
    await waitFor(() => expect(container.querySelector('a[href="/tables/t4"]')).toBeInTheDocument());
    const maintLink = container.querySelector('a[href="/tables/t4"]')!;
    expect(maintLink.className).toContain("grayscale");
    expect(maintLink.className).toContain("opacity-60");
  });

  it("renders link href as /tables/:id for each table", async () => {
    apiFetchMock.mockResolvedValue(tablesPayload(Date.now()));
    const { container } = render(<LiveTableStatus />);
    await waitFor(() => expect(container.querySelector('a[href="/tables/t1"]')).toBeInTheDocument());
    expect(container.querySelector('a[href="/tables/t2"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/tables/t3"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/tables/t4"]')).toBeInTheDocument();
  });

  it("calls apiFetch with /admin/tables", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<LiveTableStatus />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls[0]![0]).toBe("/admin/tables");
  });
});
