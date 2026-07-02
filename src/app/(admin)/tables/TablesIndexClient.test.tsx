import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, cleanup, act } from "@testing-library/react";
import { axe } from "vitest-axe";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/api", () => ({
  apiFetch: apiFetchMock,
  formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
}));

vi.mock("../../../lib/datetime", () => ({
  formatTime: (s: string) => `t:${s}`,
}));

vi.mock("../../../components/AddTableModal", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="add-modal">
        <button onClick={onClose}>close-add</button>
      </div>
    ) : null,
}));

vi.mock("../../../components/EditTableModal", () => ({
  default: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
    table: unknown;
    onSaved: () => void;
  }) =>
    open ? (
      <div data-testid="edit-modal">
        <button onClick={onClose}>close-edit</button>
      </div>
    ) : null,
}));

vi.mock("../../../components/PlayerAvatar", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid="player-avatar">{name}</span>
  ),
}));

vi.mock("phosphor-react", () => ({
  GridFour: () => <span />,
  List: () => <span />,
  SortAscending: () => <span />,
  PencilSimple: () => <span />,
  CalendarX: () => <span data-testid="icon-block" />,
  CalendarCheck: () => <span data-testid="icon-unblock" />,
  ClockCounterClockwise: () => <span />,
  Plus: () => <span />,
}));

vi.mock("../../../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@rivora-labz/snook-shared", () => ({}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import TablesIndexClient from "./TablesIndexClient";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const makeTable = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  tableNumber: 1,
  type: "SNOOKER",
  hourlyRate: 15000,
  pricePerHourFils: 15000,
  status: "AVAILABLE" as const,
  todayRevenue: 45000,
  utilization: 65,
  currentBooking: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TablesIndexClient", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    // Stub setInterval to avoid running the 15-second poll in tests
    vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // 1. Loading skeleton
  it("renders 6 animate-pulse skeleton cards while fetch is pending", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<TablesIndexClient />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(6);
  });

  // 2. "Tables" heading
  it("renders 'Tables' heading after fetch resolves", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeTable()] });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Tables")).toBeTruthy());
  });

  // 3. "Add Table" button present
  it("renders 'Add Table' button", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TablesIndexClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Add Table/i })).toBeTruthy()
    );
  });

  // 4. Filter tab labels
  it("renders all five filter tabs (All, Available, In Use, Reserved, Maintenance)", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText(/^All \(/)).toBeTruthy());
    expect(screen.getByText(/^Available \(/)).toBeTruthy();
    expect(screen.getByText(/^In Use \(/)).toBeTruthy();
    expect(screen.getByText(/^Reserved \(/)).toBeTruthy();
    expect(screen.getByText(/^Maintenance \(/)).toBeTruthy();
  });

  // 5. Tab counts update after data loads
  it("tab counts reflect loaded data", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        makeTable({ id: "t1", status: "AVAILABLE" }),
        makeTable({ id: "t2", status: "AVAILABLE" }),
        makeTable({ id: "t3", status: "IN_PLAY" }),
      ],
    });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("All (3)")).toBeTruthy());
    expect(screen.getByText("Available (2)")).toBeTruthy();
    expect(screen.getByText("In Use (1)")).toBeTruthy();
    expect(screen.getByText("Reserved (0)")).toBeTruthy();
    expect(screen.getByText("Maintenance (0)")).toBeTruthy();
  });

  // 6. Table card renders padded table number
  it("renders table number as 'Table 01' on the card", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeTable({ tableNumber: 1 })] });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());
  });

  // 7. Status badge label
  it("renders 'Available' status badge label on an AVAILABLE table card", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeTable({ status: "AVAILABLE" })] });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Available")).toBeTruthy());
  });

  // 8. Add Table button opens AddTableModal
  it("clicking 'Add Table' opens AddTableModal", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TablesIndexClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Add Table/i })).toBeTruthy()
    );
    expect(screen.queryByTestId("add-modal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Add Table/i }));
    expect(screen.getByTestId("add-modal")).toBeTruthy();
  });

  // 9. Edit button on card opens EditTableModal
  it("clicking the Edit button on a card opens EditTableModal", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeTable()] });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());
    expect(screen.queryByTestId("edit-modal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit table" }));
    expect(screen.getByTestId("edit-modal")).toBeTruthy();
  });

  // 10. IN_PLAY table with booking shows PlayerAvatar
  it("shows PlayerAvatar for an IN_PLAY table that has a currentBooking", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        makeTable({
          id: "t1",
          status: "IN_PLAY",
          currentBooking: {
            id: "bk1",
            host: { id: "u1", displayName: "Alice Smith", avatarUrl: null },
            startAt: "2026-06-01T10:00:00Z",
            endAt: "2026-06-01T11:00:00Z",
          },
        }),
      ],
    });
    render(<TablesIndexClient />);
    await waitFor(() =>
      expect(screen.getByTestId("player-avatar")).toBeTruthy()
    );
    expect(screen.getByTestId("player-avatar").textContent).toContain("Alice Smith");
  });

  // 11. Clicking "Available" filter tab filters to only AVAILABLE tables
  it("clicking the 'Available' tab filters to only AVAILABLE tables", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        makeTable({ id: "t1", tableNumber: 1, status: "AVAILABLE" }),
        makeTable({ id: "t2", tableNumber: 2, status: "IN_PLAY" }),
      ],
    });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());
    expect(screen.getByText("Table 02")).toBeTruthy(); // both cards visible initially

    fireEvent.click(screen.getByText(/^Available \(/));
    expect(screen.getByText("Table 01")).toBeTruthy();
    expect(screen.queryByText("Table 02")).toBeNull();
  });

  // 12. "All" tab shows all tables
  it("'All' tab always shows all tables regardless of status", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        makeTable({ id: "t1", tableNumber: 1, status: "AVAILABLE" }),
        makeTable({ id: "t2", tableNumber: 2, status: "IN_PLAY" }),
        makeTable({ id: "t3", tableNumber: 3, status: "MAINTENANCE" }),
      ],
    });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());

    // Switch away then back to All
    fireEvent.click(screen.getByText(/^Available \(/));
    fireEvent.click(screen.getByText(/^All \(/));

    expect(screen.getByText("Table 01")).toBeTruthy();
    expect(screen.getByText("Table 02")).toBeTruthy();
    expect(screen.getByText("Table 03")).toBeTruthy();
  });

  // --- B3 block/unblock tests ---

  // 13. AVAILABLE row → click Block → dialog opens → Confirm → PATCH MAINTENANCE sent + row flips
  it("B3: clicking block on AVAILABLE table sends PATCH {status:MAINTENANCE}", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ id: "t1", status: "AVAILABLE" })] })
      .mockResolvedValueOnce({}); // PATCH response
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Block table 1" }));
    // Dialog appears
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Block" }));
    });

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/admin/tables/t1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "MAINTENANCE" }),
        })
      )
    );
  });

  // 14. PATCH failure rolls back optimistic update and calls toast.error
  it("B3: PATCH failure rolls back status and shows toast error", async () => {
    const { toast } = await import("sonner");
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeTable({ id: "t1", status: "AVAILABLE" })] })
      .mockRejectedValueOnce(new Error("Server error"));
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Block table 1" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Block" }));
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Row should be back to AVAILABLE (status badge text)
    expect(screen.getByText("Available")).toBeTruthy();
  });

  // 15. MAINTENANCE row shows Unblock affordance (CalendarCheck icon + aria-label)
  it("B3: MAINTENANCE row shows Unblock button with correct aria-label", async () => {
    apiFetchMock.mockResolvedValue({
      items: [makeTable({ id: "t1", tableNumber: 3, status: "MAINTENANCE" })],
    });
    render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 03")).toBeTruthy());

    expect(screen.getByRole("button", { name: "Unblock table 3" })).toBeTruthy();
    expect(screen.getByTestId("icon-unblock")).toBeTruthy();
  });

  // 16. axe — no a11y violations on page with a MAINTENANCE table
  it("B3: axe passes on page containing MAINTENANCE table", async () => {
    apiFetchMock.mockResolvedValue({
      items: [makeTable({ id: "t1", status: "MAINTENANCE" })],
    });
    const { container } = render(<TablesIndexClient />);
    await waitFor(() => expect(screen.getByText("Table 01")).toBeTruthy());
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
