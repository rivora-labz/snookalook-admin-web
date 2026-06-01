import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

const apiFetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();

vi.mock("../lib/api", () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
}));

vi.mock("../hooks/useRealtimeTables", () => ({
  useRealtimeTables: () => {},
}));

import { TablesGrid } from "./TablesGrid";

const makeTable = (overrides = {}) => ({
  id: "t1",
  tableNumber: 3,
  type: "SNOOKER",
  hourlyRate: 100_00,
  status: "AVAILABLE" as const,
  currentSessionStartedAt: null,
  currentBooking: null,
  ...overrides,
});

const staffPayload = { staffMember: { centerId: "center-1" } };

describe("TablesGrid", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders loading skeleton (8 pulse cards) before fetch resolves", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<TablesGrid />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(8);
  });

  it("renders error message + retry button on fetch failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("network error"));
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("network error")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("retry button triggers a new fetch", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new Error("first fail"))
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValue({ items: [] });
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(
        screen.getByText(/No tables found/),
      ).toBeTruthy(),
    );
  });

  it("renders empty state when items array is empty", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TablesGrid />);
    await waitFor(() =>
      expect(screen.getByText(/No tables found/)).toBeTruthy(),
    );
    expect(screen.getByText(/pnpm db:seed/)).toBeTruthy();
  });

  it("renders one card per table", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        items: [makeTable({ id: "t1" }), makeTable({ id: "t2", tableNumber: 5 })],
      })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy());
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("renders table type label", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ type: "POOL" })] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("POOL")).toBeTruthy());
  });

  it("renders AVAILABLE status label", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ status: "AVAILABLE" })] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("Available")).toBeTruthy());
  });

  it("renders IN_PLAY status label", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ status: "IN_PLAY" })] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("In Play")).toBeTruthy());
  });

  it("renders RESERVED status label", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ status: "RESERVED" })] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("Reserved")).toBeTruthy());
  });

  it("renders MAINTENANCE status label", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ status: "MAINTENANCE" })] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("Maintenance")).toBeTruthy());
  });

  it("renders booking host displayName when currentBooking is present", async () => {
    const tableWithBooking = makeTable({
      status: "IN_PLAY",
      currentBooking: {
        id: "bk-1",
        host: { id: "u1", displayName: "Bob Player", avatarUrl: null },
        startAt: "2026-06-01T10:00:00Z",
        endAt: "2026-06-01T11:00:00Z",
      },
    });
    apiFetchMock
      .mockResolvedValueOnce({ items: [tableWithBooking] })
      .mockResolvedValue(staffPayload);
    render(<TablesGrid />);
    await waitFor(() => expect(screen.getByText("Bob Player")).toBeTruthy());
  });

  it("calls apiFetch('/admin/tables') on mount", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TablesGrid />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls.some((c) => c[0] === "/admin/tables")).toBe(true);
  });

  it("calls apiFetch('/staff/me') to resolve centerId for realtime", async () => {
    apiFetchMock.mockResolvedValue({ items: [], staffMember: { centerId: "c1" } });
    render(<TablesGrid />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls.some((c) => c[0] === "/staff/me")).toBe(true);
  });
});
