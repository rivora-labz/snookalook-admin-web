import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { axe } from "vitest-axe";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const apiFetchMock = vi.hoisted(() => vi.fn());
const MockApiError = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = "ApiError";
    }
  }
  return ApiError;
});

vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
  formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
  ApiError: MockApiError,
}));

vi.mock("../lib/datetime", () => ({
  getTodayDubai: () => "2026-07-02",
  assembleDubaiStartAt: (date: string, slot: string) => `${date}T14:00:00+04:00-stub-${slot}`,
  formatDate: (s: string) => s,
  formatDateShort: (s: string) => s,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mutable state for useAdmin so individual tests can override values
let mockIsBookingOpen = false;
let mockSetIsBookingOpen = vi.fn();
let mockIsActivityOpen = false;
let mockSetIsActivityOpen = vi.fn();

vi.mock("../lib/AdminContext", () => ({
  AdminProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAdmin: () => ({
    isBookingOpen: mockIsBookingOpen,
    setIsBookingOpen: mockSetIsBookingOpen,
    isActivityOpen: mockIsActivityOpen,
    setIsActivityOpen: mockSetIsActivityOpen,
  }),
}));

vi.mock("../lib/use-admin-activity", () => ({
  useAdminActivity: () => ({ items: [], isLoading: false }),
  formatRelativeTime: (s: string) => s,
  activityTypeMeta: () => ({ color: "#fff", category: "booking" }),
  activityText: () => "activity text",
}));

vi.mock("sonner", () => ({ Toaster: () => null, toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock("./AdminNav", () => ({ default: () => <nav data-testid="admin-nav" /> }));
vi.mock("./AdminHeader", () => ({ default: () => <header data-testid="admin-header" /> }));
vi.mock("./DrawerOverlay", () => ({ default: () => null }));
vi.mock("./PlayerAvatar", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

// phosphor-react icons — minimal stubs so the component can render
vi.mock("phosphor-react", () => ({
  X: () => <span data-testid="x-icon" />,
  Check: () => <span data-testid="check-icon" />,
  WarningCircle: () => <span data-testid="warning-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import AdminShell from "./AdminShell";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLAYER = {
  userId: "u-alice",
  displayName: "Alice",
  avatarUrl: null,
  email: null,
  phone: null,
  skillTier: null,
  winRate: null,
  gamesPlayed: 5,
  rating: 1200,
  joinedAt: "2026-01-01",
};

const TABLE = {
  id: "tbl-1",
  centerId: "c1",
  tableNumber: 3,
  type: "SNOOKER",
  hourlyRate: 15000,
  pricePerHourFils: 15000,
  status: "AVAILABLE",
  currentBooking: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderShell(children: React.ReactNode = <p>child content</p>) {
  return render(<AdminShell>{children}</AdminShell>);
}

/** Simulate selecting a player, date-slot, table, then clicking Confirm.
 *  Requires vi.useFakeTimers() to be active. Uses act+advanceTimersByTime
 *  to avoid waitFor deadlocks (waitFor uses setTimeout internally). */
async function fillAndSubmitBooking(container: HTMLElement) {
  // Open player dropdown
  fireEvent.click(screen.getByPlaceholderText(/search player/i));

  // Advance past 200ms debounce + flush all promise microtasks
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  // Flush remaining microtasks from apiFetch resolution
  await act(async () => {});

  // Alice appears twice (PlayerAvatar mock + display span) — both inside the dropdown row
  const aliceEls = screen.getAllByText("Alice");
  expect(aliceEls.length).toBeGreaterThan(0);
  fireEvent.click(aliceEls[0]!);

  // Select first time slot (2:00 PM)
  const slotBtns = container.querySelectorAll<HTMLButtonElement>(".hide-scrollbar button");
  if (slotBtns.length > 0) fireEvent.click(slotBtns[0]!);
  else fireEvent.click(screen.getAllByRole("button", { name: /PM/ })[0]!);

  // Table T3 loaded via immediate apiFetch — synchronous check
  const t3Btn = screen.getByRole("button", { name: /T3/ });
  fireEvent.click(t3Btn);

  // Click Confirm and flush async handler
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Confirm Booking/i }));
  });
  await act(async () => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminShell", () => {
  beforeEach(() => {
    // Reset spy functions and default state before each test
    mockIsBookingOpen = false;
    mockSetIsBookingOpen = vi.fn();
    mockIsActivityOpen = false;
    mockSetIsActivityOpen = vi.fn();

    // Default: apiFetch resolves to empty lists (prevents unhandled promise)
    apiFetchMock.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // 1. Renders children in main content area
  it("renders children in main content area", () => {
    renderShell(<p>hello world</p>);
    expect(screen.getByText("hello world")).toBeTruthy();
  });

  // 2. Renders AdminNav
  it("renders AdminNav (data-testid=admin-nav)", () => {
    renderShell();
    expect(screen.getByTestId("admin-nav")).toBeTruthy();
  });

  // 3. Renders AdminHeader
  it("renders AdminHeader (data-testid=admin-header)", () => {
    renderShell();
    expect(screen.getByTestId("admin-header")).toBeTruthy();
  });

  // 4. Booking drawer hidden by default (translate-x-full)
  it("booking drawer has translate-x-full class when isBookingOpen=false", () => {
    const { container } = renderShell();
    // The booking drawer is the first fixed panel (w-[420px])
    const bookingDrawer = container.querySelector(".w-\\[420px\\]");
    expect(bookingDrawer).toBeTruthy();
    expect(bookingDrawer!.className).toContain("translate-x-full");
  });

  // 5. Activity drawer hidden by default (translate-x-full)
  it("activity drawer has translate-x-full class when isActivityOpen=false", () => {
    const { container } = renderShell();
    // The activity drawer is the fixed panel (w-[380px])
    const activityDrawer = container.querySelector(".w-\\[380px\\]");
    expect(activityDrawer).toBeTruthy();
    expect(activityDrawer!.className).toContain("translate-x-full");
  });

  // 6. Booking drawer visible when isBookingOpen=true
  it("booking drawer has translate-x-0 class when isBookingOpen=true", () => {
    mockIsBookingOpen = true;
    const { container } = renderShell();
    const bookingDrawer = container.querySelector(".w-\\[420px\\]");
    expect(bookingDrawer).toBeTruthy();
    expect(bookingDrawer!.className).toContain("translate-x-0");
  });

  // 7. Activity drawer visible when isActivityOpen=true
  it("activity drawer has translate-x-0 class when isActivityOpen=true", () => {
    mockIsActivityOpen = true;
    const { container } = renderShell();
    const activityDrawer = container.querySelector(".w-\\[380px\\]");
    expect(activityDrawer).toBeTruthy();
    expect(activityDrawer!.className).toContain("translate-x-0");
  });

  // 8. ESC keydown calls setIsBookingOpen(false) when booking drawer open
  it("ESC keydown calls setIsBookingOpen(false) when booking drawer open", () => {
    mockIsBookingOpen = true;
    renderShell();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockSetIsBookingOpen).toHaveBeenCalledWith(false);
  });

  // 9. ESC keydown also calls setIsActivityOpen(false)
  it("ESC keydown calls setIsActivityOpen(false) when activity drawer open", () => {
    mockIsActivityOpen = true;
    renderShell();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockSetIsActivityOpen).toHaveBeenCalledWith(false);
  });

  // 10. Duration picker renders all four tab buttons
  it("duration picker renders '1 hr', '2 hr', '3 hr', 'Custom' buttons", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "1 hr" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2 hr" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3 hr" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Custom" })).toBeTruthy();
  });

  // 11. Activity filter bar renders all four filter buttons
  it("activity filter bar renders 'All', 'Bookings', 'Players', 'Payments' buttons", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bookings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Players" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Payments" })).toBeTruthy();
  });

  // 12. "Confirm Booking" button exists in the booking drawer
  it("'Confirm Booking' button exists in booking drawer", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeTruthy();
  });

  // 13. Close booking drawer button calls setIsBookingOpen(false)
  it("close booking drawer button (aria-label) calls setIsBookingOpen(false)", () => {
    renderShell();
    const closeBtn = screen.getByRole("button", {
      name: "Close new booking drawer",
    });
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(mockSetIsBookingOpen).toHaveBeenCalledWith(false);
  });

  // --- B4 tests ---

  // 14. Confirm posts exact body: hostUserId (not name), ISO startAt with +04:00, durationMinutes 60
  it("B4: confirm posts body with hostUserId (uuid), +04:00 startAt, durationMinutes=60", async () => {
    vi.useFakeTimers();
    mockIsBookingOpen = true;
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith("/admin/tables")) return Promise.resolve({ items: [TABLE] });
      if (path.startsWith("/admin/players")) return Promise.resolve({ items: [PLAYER] });
      if (path === "/admin/bookings") return Promise.resolve({});
      return Promise.resolve({ items: [] });
    });

    const { container } = renderShell();
    // Flush initial render effects (tables apiFetch resolves immediately)
    await act(async () => {});
    await fillAndSubmitBooking(container);

    // Synchronous — act inside fillAndSubmitBooking already drained the POST call
    const postCall = apiFetchMock.mock.calls.find(
      (c) => c[0] === "/admin/bookings"
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1].body);
    expect(body.hostUserId).toBe("u-alice");
    expect(body.tableId).toBe("tbl-1");
    expect(body.durationMinutes).toBe(60);
    expect(body.matchMode).toBe("SOLO");
    expect(body.startAt).toContain("+04:00");
    vi.useRealTimers();
  });

  // 15. 409 slot-taken: drawer stays open, inline error appears (role=alert)
  it("B4: 409 response keeps drawer open and shows inline slot-taken error", async () => {
    vi.useFakeTimers();
    mockIsBookingOpen = true;
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith("/admin/tables")) return Promise.resolve({ items: [TABLE] });
      if (path.startsWith("/admin/players")) return Promise.resolve({ items: [PLAYER] });
      if (path === "/admin/bookings")
        return Promise.reject(new MockApiError(409, "SLOT_ALREADY_TAKEN", "Slot taken"));
      return Promise.resolve({ items: [] });
    });

    const { container } = renderShell();
    await act(async () => {});
    await fillAndSubmitBooking(container);

    // act inside fillAndSubmitBooking flushed the rejected POST; error should be inline
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("slot is already taken");
    expect(mockSetIsBookingOpen).not.toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  // 16. Date defaults to today (getTodayDubai mock returns "2026-07-02")
  it("B4: date input defaults to today's Dubai date", () => {
    mockIsBookingOpen = true;
    renderShell();
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe("2026-07-02");
  });

  // 17. axe — no a11y violations with booking drawer open
  it("B4: axe passes with booking drawer open", async () => {
    vi.useRealTimers(); // ensure real timers for waitFor
    mockIsBookingOpen = true;
    apiFetchMock.mockResolvedValue({ items: [] });
    const { container } = renderShell();
    // "New Booking" is in the drawer header — always present when isBookingOpen=true
    expect(screen.getByText("New Booking")).toBeTruthy();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
