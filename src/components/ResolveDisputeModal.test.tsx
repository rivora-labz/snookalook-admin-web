import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { useRef } from "react";
import ResolveDisputeModal, { type DisputeRecord } from "./ResolveDisputeModal";

const apiFetchMock = vi.fn();

vi.mock("../lib/api", async () => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  }
  return {
    apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
    ApiError,
    formatAED: (fils: number) => `AED ${(fils / 100).toFixed(2)}`,
  };
});

vi.mock("../lib/datetime", () => ({
  formatDateTime: (iso: string) => `fmt(${iso})`,
}));

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => useRef<HTMLDivElement>(null),
}));

const dispute: DisputeRecord = {
  id: "d1",
  bookingId: "abcdef0123456789",
  reason: "Bad call on frame 7",
  openedAt: "2026-05-01T10:00:00Z",
  openedBy: { id: "host-1", displayName: "Alice" },
  hostUserId: "host-1",
  opponentUserId: "opp-1",
  stakeFils: 5000,
  startAt: "2026-05-01T09:00:00Z",
};

beforeEach(() => {
  apiFetchMock.mockReset();
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderModal(overrides: Partial<Parameters<typeof ResolveDisputeModal>[0]> = {}) {
  return render(
    <ResolveDisputeModal
      open={true}
      dispute={dispute}
      onClose={vi.fn()}
      onResolved={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ResolveDisputeModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = renderModal({ open: false });
    expect(container.textContent).toBe("");
  });

  it("renders nothing when dispute=null", () => {
    const { container } = renderModal({ dispute: null });
    expect(container.textContent).toBe("");
  });

  it("renders title + reason + booking id slice", () => {
    renderModal();
    expect(screen.getByText("Resolve dispute")).toBeDefined();
    expect(screen.getByText("Bad call on frame 7")).toBeDefined();
    expect(screen.getByText("abcdef01")).toBeDefined();
    expect(screen.getByText("AED 50.00")).toBeDefined();
  });

  it("requires admin note before submit", () => {
    renderModal();
    fireEvent.click(screen.getByText("Confirm reporter"));
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/admin note required/i)).toBeDefined();
  });

  it("submits CONFIRM_REPORTED with openedBy as winner", async () => {
    apiFetchMock.mockResolvedValue({});
    const onResolved = vi.fn();
    renderModal({ onResolved });
    fireEvent.change(screen.getByPlaceholderText(/briefly justify/i), {
      target: { value: "Confirmed via video" },
    });
    fireEvent.click(screen.getByText("Confirm reporter"));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = apiFetchMock.mock.calls[0]!;
    expect(path).toBe("/admin/matches/d1/resolve");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      outcome: "RESOLVED",
      resolvedWinnerUserId: "host-1",
      resolution: "Confirmed via video",
    });
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it("submits FLIP_WINNER with opponent as winner", async () => {
    apiFetchMock.mockResolvedValue({});
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/briefly justify/i), {
      target: { value: "Opp was correct" },
    });
    fireEvent.click(screen.getByText("Flip winner"));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(apiFetchMock.mock.calls[0]![1].body).resolvedWinnerUserId).toBe("opp-1");
  });

  it("blocks FLIP_WINNER when opponent missing", () => {
    renderModal({ dispute: { ...dispute, opponentUserId: null } });
    fireEvent.change(screen.getByPlaceholderText(/briefly justify/i), {
      target: { value: "x" },
    });
    const flipBtn = screen.getByText("Flip winner").closest("button") as HTMLButtonElement;
    expect(flipBtn.disabled).toBe(true);
    expect(screen.getByText(/no opponent/i)).toBeDefined();
  });

  it("submits DISMISS with REJECTED + null winner", async () => {
    apiFetchMock.mockResolvedValue({});
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/briefly justify/i), {
      target: { value: "Spurious" },
    });
    fireEvent.click(screen.getByText("Dismiss"));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(apiFetchMock.mock.calls[0]![1].body);
    expect(body.outcome).toBe("REJECTED");
    expect(body.resolvedWinnerUserId).toBeNull();
  });

  it("surfaces endpointGap warning on 404 ApiError", async () => {
    const { ApiError } = await import("../lib/api");
    apiFetchMock.mockRejectedValue(new ApiError(404, "not_found", "missing"));
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/briefly justify/i), {
      target: { value: "n/a" },
    });
    fireEvent.click(screen.getByText("Dismiss"));
    await waitFor(() => expect(screen.getByText(/founder gap/i)).toBeDefined());
  });

  it("Close button triggers onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
