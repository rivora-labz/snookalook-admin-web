import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
}));

vi.mock("../lib/datetime", () => ({
  formatDateTime: (s: string) => `dt:${s}`,
}));

import ResolveDisputeModal, { type DisputeRecord } from "./ResolveDisputeModal";

const dispute: DisputeRecord = {
  id: "d1",
  bookingId: "bk-12345678",
  reason: "Player did not show",
  openedAt: "2024-01-01T10:00:00Z",
  openedBy: { id: "u1", displayName: "Alice" },
  hostUserId: "u1",
  opponentUserId: "u2",
  stakeFils: 5000,
  startAt: "2024-01-01T09:00:00Z",
};

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("ResolveDisputeModal", () => {
  it("renders null when open=false", () => {
    const { container } = render(
      <ResolveDisputeModal open={false} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when dispute=null", () => {
    const { container } = render(
      <ResolveDisputeModal open={true} dispute={null} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders role=dialog with aria-modal=true", () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("renders bookingId first 8 chars", () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByText("bk-12345")).toBeTruthy();
  });

  it("renders reporter display name", () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("renders dispute reason", () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByText("Player did not show")).toBeTruthy();
  });

  it("Close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={onClose} onResolved={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submit without admin note shows 'Admin note required.' error", async () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Confirm reporter"));
    await waitFor(() => expect(screen.getByText("Admin note required.")).toBeTruthy());
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("DISMISS with note calls apiFetch and onResolved", async () => {
    const onResolved = vi.fn();
    apiFetchMock.mockResolvedValue({});

    render(
      <ResolveDisputeModal
        open={true}
        dispute={dispute}
        onClose={vi.fn()}
        onResolved={onResolved}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Briefly justify/), {
      target: { value: "Admin reviewed — dismissing" },
    });
    fireEvent.click(screen.getByText("Dismiss"));
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/matches/d1/resolve"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("FLIP_WINNER without opponentUserId shows opponent-missing warning", async () => {
    const noOpponentDispute: DisputeRecord = { ...dispute, opponentUserId: null };
    render(
      <ResolveDisputeModal
        open={true}
        dispute={noOpponentDispute}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Briefly justify/), {
      target: { value: "flip note" },
    });
    const flipBtn = screen.getByText("Flip winner").closest("button")!;
    expect((flipBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders formatted stake via formatAED", () => {
    render(
      <ResolveDisputeModal open={true} dispute={dispute} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByText("AED 50.00")).toBeTruthy();
  });
});
