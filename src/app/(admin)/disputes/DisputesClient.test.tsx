import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── mocks (all vi.mock calls must precede any import of the module under test) ──

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/api", () => ({
  apiFetch: apiFetchMock,
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
}));

let sessionRoleMock = "OWNER";
vi.mock("../../../lib/use-staff-session", () => ({
  useStaffSession: () => ({ session: { role: sessionRoleMock } }),
}));

vi.mock("../../../lib/datetime", () => ({
  formatDateShort: (s: string) => `date:${s}`,
  formatTime: (s: string) => `time:${s}`,
}));

vi.mock("../../../lib/status-tokens", () => ({
  STATUS_TOKEN: {
    WARNING: "#F39C12",
    SUCCESS: "#2ECC71",
    NEUTRAL: "#808080",
    INFO: "#9B59B6",
  },
  STATUS_TOKEN_TEXT: {
    WARNING: "#fff",
    SUCCESS: "#fff",
    NEUTRAL: "#fff",
    INFO: "#fff",
  },
}));

vi.mock("../../../components/ResolveDisputeModal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="resolve-modal" /> : null,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// ── import component after mocks ──
import DisputesClient from "./DisputesClient";

// ── fixture helpers ──

const makeDispute = (overrides: Record<string, unknown> = {}) => ({
  id: "d1234567-abcd-efgh",
  bookingId: "b1234567-xxxx-yyyy",
  status: "OPEN" as const,
  reason: "Player no-show",
  claimType: "WIN_REPORTED",
  openedAt: "2024-06-01T10:00:00Z",
  openedBy: { id: "u1", displayName: "Alice" },
  booking: {
    id: "b1234567-xxxx-yyyy",
    hostUserId: "u1",
    opponentUserId: "u2",
    startAt: "2024-06-01T09:00:00Z",
    totalAmount: 5000,
  },
  ...overrides,
});

const makeListResponse = (items: ReturnType<typeof makeDispute>[]) => ({
  items,
  total: items.length,
});

beforeEach(() => {
  apiFetchMock.mockReset();
  sessionRoleMock = "OWNER";
});

// ── tests ──

describe("DisputesClient", () => {
  // 1. loading skeleton
  it("renders loading skeleton (4 animated rows) while fetch is pending", () => {
    // never resolves → stays in loading state
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DisputesClient />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
  });

  // 2. filter bar
  it("renders filter bar with ALL / OPEN / RESOLVED buttons", async () => {
    apiFetchMock.mockResolvedValue(makeListResponse([]));
    render(<DisputesClient />);
    // buttons are present immediately (rendered in filterBar before loading check)
    expect(screen.getByRole("button", { name: "ALL" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "OPEN" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "RESOLVED" })).toBeTruthy();
  });

  // 3. error state
  it("renders error message and Retry button on fetch failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("Network error"));
    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  // 4. retry re-fetches
  it("Retry button triggers a re-fetch", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(makeListResponse([]));

    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
  });

  // 5. 404 endpoint gap warning banner
  it("renders 404 endpoint gap warning banner", async () => {
    const { ApiError } = await import("../../../lib/api");
    apiFetchMock.mockRejectedValue(new ApiError(404, "ERR", "not found"));
    const { container } = render(<DisputesClient />);
    // The banner text is split across elements (<p> contains inline <code>),
    // so we query the container textContent instead of a single text node.
    await waitFor(() => {
      const text = container.textContent ?? "";
      expect(text).toContain("Backend");
      expect(text).toContain("/v1/admin/matches/disputes");
    });
  });

  // 6. empty state — OPEN filter
  it("renders empty state for OPEN filter", async () => {
    apiFetchMock.mockResolvedValue(makeListResponse([]));
    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByText(/No open disputes/)).toBeTruthy(),
    );
  });

  // 7. empty state — ALL filter
  it("renders empty state for ALL filter", async () => {
    apiFetchMock.mockResolvedValue(makeListResponse([]));
    render(<DisputesClient />);
    // switch to ALL
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "ALL" })).toBeTruthy(),
    );
    apiFetchMock.mockResolvedValue(makeListResponse([]));
    fireEvent.click(screen.getByRole("button", { name: "ALL" }));
    await waitFor(() =>
      expect(screen.getByText("No disputes.")).toBeTruthy(),
    );
  });

  // 8. table renders reporter + reason
  it("renders dispute table with reporter name and reason when data loaded", async () => {
    apiFetchMock.mockResolvedValue(makeListResponse([makeDispute()]));
    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByText("Alice")).toBeTruthy(),
    );
    expect(screen.getByText("Player no-show")).toBeTruthy();
  });

  // 9. Review button visible for OPEN dispute when OWNER
  it("Review button is visible for OPEN dispute when role=OWNER", async () => {
    sessionRoleMock = "OWNER";
    apiFetchMock.mockResolvedValue(makeListResponse([makeDispute({ status: "OPEN" })]));
    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Review" })).toBeTruthy(),
    );
  });

  // 10. Review button NOT rendered when role=STAFF
  it("Review button is NOT rendered when role=STAFF", async () => {
    sessionRoleMock = "STAFF";
    apiFetchMock.mockResolvedValue(makeListResponse([makeDispute({ status: "OPEN" })]));
    render(<DisputesClient />);
    await waitFor(() =>
      expect(screen.getByText("Alice")).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
  });

  // 11. clicking Review opens resolve modal
  it("clicking Review renders the ResolveDisputeModal", async () => {
    sessionRoleMock = "OWNER";
    apiFetchMock.mockResolvedValue(makeListResponse([makeDispute({ status: "OPEN" })]));
    render(<DisputesClient />);
    const reviewBtn = await screen.findByRole("button", { name: "Review" });
    expect(screen.queryByTestId("resolve-modal")).toBeNull();
    fireEvent.click(reviewBtn);
    expect(screen.getByTestId("resolve-modal")).toBeTruthy();
  });

  // 12. ClaimTypePill rendering
  it("ClaimTypePill: null renders dash; WIN_REPORTED renders pill text", async () => {
    const disputes = [
      makeDispute({ id: "d1111111-null-xxxx", claimType: null }),
      makeDispute({ id: "d2222222-win-xxxx", claimType: "WIN_REPORTED" }),
    ];
    apiFetchMock.mockResolvedValue(makeListResponse(disputes));
    const { container } = render(<DisputesClient />);
    // Both rows have displayName "Alice" — use getAllByText
    await waitFor(() =>
      expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1),
    );
    // null claim type → "—" dash rendered as <span class="text-th-text-tertiary">
    const dashes = Array.from(container.querySelectorAll("td")).filter(
      (td) => td.textContent?.trim() === "—",
    );
    expect(dashes.length).toBeGreaterThanOrEqual(1);
    // WIN_REPORTED → pill with text "WIN REPORTED"
    expect(screen.getByText("WIN REPORTED")).toBeTruthy();
  });
});
