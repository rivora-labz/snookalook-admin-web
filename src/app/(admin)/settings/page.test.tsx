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

vi.mock("../../../lib/api", () => ({
  apiFetch: apiFetchMock,
  ApiError: MockApiError,
}));

vi.mock("../../../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("sonner", () => ({
  toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

vi.mock("phosphor-react", () => ({
  Buildings: () => null,
  Clock: () => null,
  CurrencyCircleDollar: () => null,
  XCircle: () => null,
  UsersThree: () => null,
  Bank: () => null,
  Bell: () => null,
  Check: () => null,
  CheckCircle: () => null,
  DotsThree: () => null,
  X: ({ size }: { size?: number }) => <span data-testid="x-icon" aria-hidden="true" data-size={size} />,
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import SettingsPage from "./page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SETTINGS = {
  profile: { name: "Test Club", address: "123 Main St", city: "Dubai", lat: null, lng: null, heroImage: null },
  hours: {},
  pricing: {},
  cancellation: {},
  payouts: {},
  notifications: {},
};

const PLAYER = {
  userId: "u-alice",
  displayName: "Alice",
  avatarUrl: null,
  phone: "+971501234567",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultApiFetch(url: string, opts?: RequestInit) {
  if (url === "/admin/settings") return Promise.resolve(SETTINGS);
  if (url === "/admin/team") return Promise.resolve({ items: [] });
  if (url.startsWith("/admin/players")) return Promise.resolve({ items: [PLAYER] });
  return Promise.resolve({});
}

async function goToTeamTab() {
  fireEvent.click(screen.getByRole("button", { name: "Team & Roles" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Invite member/i })).toBeTruthy());
}

async function openInviteDialog() {
  fireEvent.click(screen.getByRole("button", { name: /Invite member/i }));
  await waitFor(() => expect(screen.getByText("Invite team member")).toBeTruthy());
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("SettingsPage — B2 invite picker", () => {
  beforeEach(() => {
    apiFetchMock.mockImplementation(defaultApiFetch);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // 1. Debounce: only one fetch fires after 200ms, not on every keystroke
  it("B2: debounce fires exactly one player-search request after 200ms", async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText("Club Settings")).toBeTruthy());
    await goToTeamTab();
    await openInviteDialog();

    // Clear prior fetch calls (settings + team loads)
    apiFetchMock.mockClear();
    vi.useFakeTimers();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "alice" } });

    // No request yet — within debounce window
    expect(apiFetchMock).not.toHaveBeenCalled();

    // Advance past 200ms debounce + flush promise microtasks
    await act(async () => { vi.advanceTimersByTime(250); });
    await act(async () => {});

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock.mock.calls[0]![0]).toContain("/admin/players?search=alice");

    vi.useRealTimers();
  });

  // 2. 409 ALREADY_STAFF shows inline error (role=alert), not toast
  it("B2: 409 response shows inline error with role=alert", async () => {
    apiFetchMock.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/admin/settings") return Promise.resolve(SETTINGS);
      if (url === "/admin/team") {
        if (opts?.method === "POST")
          return Promise.reject(new MockApiError(409, "ALREADY_STAFF", "Already staff"));
        return Promise.resolve({ items: [] });
      }
      return Promise.resolve({});
    });

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText("Club Settings")).toBeTruthy());
    await goToTeamTab();
    await openInviteDialog();

    // Use UUID fallback (jsdom makes details content always accessible)
    fireEvent.change(screen.getByPlaceholderText("uuid of existing user"), {
      target: { value: "some-uuid" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    });
    await act(async () => {});

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("already a staff member");
  });

  // 3. axe: no a11y violations with invite dialog open
  it("B2: axe passes on invite dialog", async () => {
    vi.useRealTimers();
    const { container } = render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText("Club Settings")).toBeTruthy());
    await goToTeamTab();
    await openInviteDialog();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
