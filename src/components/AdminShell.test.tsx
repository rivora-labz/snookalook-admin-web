import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
  formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
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

vi.mock("sonner", () => ({ Toaster: () => null, toast: { custom: vi.fn() } }));
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
// Helpers
// ---------------------------------------------------------------------------

function renderShell(children: React.ReactNode = <p>child content</p>) {
  return render(<AdminShell>{children}</AdminShell>);
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
});
