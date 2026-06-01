import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

const apiFetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();
const routerPushMock = vi.fn<(path: string) => void>();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

import BookingsCalendarView, { type CalBookingItem } from "./BookingsCalendarView";

function toLocalDayStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function getMondayLocal(): string {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  return toLocalDayStr(monday);
}

const sampleBooking = (overrides: Partial<CalBookingItem> = {}): CalBookingItem => {
  const day = getMondayLocal();
  return {
    id: "bk-1",
    startAt: `${day}T10:00:00`,
    endAt: `${day}T11:00:00`,
    durationMinutes: 60,
    state: "CONFIRMED" as CalBookingItem["state"],
    totalAmount: 5000,
    notes: null,
    host: { id: "h1", displayName: "Alice Host", phone: null },
    table: { id: "t1", tableNumber: 4, type: "SNOOKER" },
    payment: null,
    ...overrides,
  };
};

describe("BookingsCalendarView", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    routerPushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders week-nav buttons (Prev / This week / Next)", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    render(<BookingsCalendarView activeCenterId={null} />);
    expect(screen.getByText(/Prev/)).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText(/Next/)).toBeInTheDocument();
  });

  it("renders mobile fallback message", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    render(<BookingsCalendarView activeCenterId={null} />);
    expect(screen.getByText(/Week view is optimised for desktop/)).toBeInTheDocument();
  });

  it("renders loading skeleton while apiFetch pending", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BookingsCalendarView activeCenterId={null} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty-week message when bookings.length === 0", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(screen.getByText("No bookings this week.")).toBeInTheDocument());
  });

  it("renders error banner + Retry button on failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("network down"));
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("Retry button re-calls apiFetch", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("boom"));
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument());
    apiFetchMock.mockResolvedValueOnce({ items: [] });
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(apiFetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("Next nav advances week (re-fetches with new range)", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const initialCount = apiFetchMock.mock.calls.length;
    fireEvent.click(screen.getByText(/Next/));
    await waitFor(() => expect(apiFetchMock.mock.calls.length).toBeGreaterThan(initialCount));
  });

  it("apiFetch called with /admin/bookings with from/to/limit query params", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const path = apiFetchMock.mock.calls[0]![0];
    expect(path).toMatch(/^\/admin\/bookings\?/);
    expect(path).toMatch(/from=/);
    expect(path).toMatch(/to=/);
    expect(path).toMatch(/limit=200/);
  });

  it("appends centerId param when activeCenterId provided", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<BookingsCalendarView activeCenterId="ctr-7" />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls[0]![0]).toMatch(/centerId=ctr-7/);
  });

  it("renders legend states (Confirmed, Pending, Cancelled, etc.) + Now", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(screen.getByText("Confirmed")).toBeInTheDocument());
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("renders booking button with host displayName + ARIA label", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleBooking()] });
    render(<BookingsCalendarView activeCenterId={null} />);
    await waitFor(() => expect(screen.getByLabelText(/Alice Host table #4 — CONFIRMED/)).toBeInTheDocument());
  });

  it("clicking booking button calls onSelectBooking when provided", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleBooking()] });
    const onSelectBooking = vi.fn();
    render(<BookingsCalendarView activeCenterId={null} onSelectBooking={onSelectBooking} />);
    const btn = await screen.findByLabelText(/Alice Host table #4/);
    fireEvent.click(btn);
    expect(onSelectBooking).toHaveBeenCalledTimes(1);
    expect(onSelectBooking.mock.calls[0]![0].id).toBe("bk-1");
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("clicking booking button routes to /bookings/:id when no onSelectBooking", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleBooking()] });
    render(<BookingsCalendarView activeCenterId={null} />);
    const btn = await screen.findByLabelText(/Alice Host table #4/);
    fireEvent.click(btn);
    expect(routerPushMock).toHaveBeenCalledWith("/bookings/bk-1");
  });

  it("CANCELLED booking renders with reduced opacity (0.45)", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleBooking({ state: "CANCELLED" as CalBookingItem["state"] })] });
    render(<BookingsCalendarView activeCenterId={null} />);
    const btn = await screen.findByLabelText(/Alice Host table #4 — CANCELLED/);
    expect(btn.style.opacity).toBe("0.45");
  });
});
