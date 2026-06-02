import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ── mocks (all vi.mock calls must precede any import of the module under test) ──

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/api", () => ({
  apiFetch: apiFetchMock,
  formatDate: (s: string) => `date:${s}`,
}));

let sessionMock: { role: string; userId: string } | null = {
  role: "OWNER",
  userId: "u-owner",
};
vi.mock("../../../lib/use-staff-session", () => ({
  useStaffSession: () => ({ session: sessionMock }),
}));

vi.mock("../../../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── import after mocks ──
import TeamPage from "./page";

// ── fixture helpers ──

const makeStaff = (overrides: Partial<{
  id: string;
  user: { id: string; displayName: string; avatarUrl: null; email: string | null; phone: string | null };
  role: "OWNER" | "MANAGER" | "STAFF";
  createdAt: string;
}> = {}) => ({
  id: "s1",
  user: { id: "u1", displayName: "Alice", avatarUrl: null, email: "alice@example.com", phone: null },
  role: "MANAGER" as const,
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

beforeEach(() => {
  apiFetchMock.mockReset();
  sessionMock = { role: "OWNER", userId: "u-owner" };
});

describe("TeamPage", () => {
  // 1. loading skeleton
  it("renders loading skeleton while fetch is pending", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<TeamPage />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
  });

  // 2. error state
  it("renders error message and Retry button on fetch failure", async () => {
    apiFetchMock.mockRejectedValue(new Error("Network error"));
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByText("Network error")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  // 3. empty state
  it("renders empty state when team has no members", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TeamPage />);
    await waitFor(() =>
      expect(screen.getByText("No team members found.")).toBeTruthy(),
    );
  });

  // 4. OWNER sees Add Staff button
  it("OWNER sees Add Staff button", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TeamPage />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "+ Add Staff" })).toBeTruthy();
  });

  // 5. MANAGER does not see Add Staff button
  it("MANAGER does not see Add Staff button", async () => {
    sessionMock = { role: "MANAGER", userId: "u-manager" };
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TeamPage />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "+ Add Staff" })).toBeNull();
  });

  // 6. OWNER sees Remove on others' rows
  it("OWNER sees Remove button on other members' rows", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeStaff({ id: "s1", user: { id: "u1", displayName: "Alice", avatarUrl: null, email: null, phone: null } })] });
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  // 7. OWNER does NOT see Remove on own row
  it("OWNER does not see Remove on their own row", async () => {
    apiFetchMock.mockResolvedValue({
      items: [makeStaff({ id: "s-owner", user: { id: "u-owner", displayName: "Me", avatarUrl: null, email: null, phone: null } })],
    });
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByText("Me")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  // 8. MANAGER does not see Remove on any row
  it("MANAGER does not see Remove buttons", async () => {
    sessionMock = { role: "MANAGER", userId: "u-manager" };
    apiFetchMock.mockResolvedValue({ items: [makeStaff()] });
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  // 9. Remove button opens confirm modal
  it("clicking Remove opens the confirm modal", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeStaff()] });
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Staff Member" });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText("Alice")).toBeTruthy();
  });

  // 10. Cancel in confirm modal closes it
  it("Cancel in confirm modal closes it without calling apiFetch again", async () => {
    apiFetchMock.mockResolvedValue({ items: [makeStaff()] });
    render(<TeamPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Remove Staff Member" })).toBeNull();
    expect(apiFetchMock).toHaveBeenCalledTimes(1); // only the initial fetch
  });

  // 11. Confirm remove calls DELETE and refreshes
  it("confirming remove calls DELETE and re-fetches team", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ items: [makeStaff({ id: "s1" })] })
      .mockResolvedValueOnce(undefined) // DELETE
      .mockResolvedValueOnce({ items: [] }); // re-fetch

    render(<TeamPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Staff Member" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(3));
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/team/s1", { method: "DELETE" });
  });

  // 12. Add Staff button opens add modal
  it("clicking Add Staff opens the add modal", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    render(<TeamPage />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "+ Add Staff" }));
    expect(screen.getByRole("dialog", { name: "Add Staff Member" })).toBeTruthy();
  });
});
