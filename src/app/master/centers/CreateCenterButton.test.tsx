import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), custom: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("phosphor-react", () => ({
  X: () => <span data-testid="x-icon" />,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import CreateCenterButton from "./CreateCenterButton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAndOpen() {
  const result = render(<CreateCenterButton />);
  fireEvent.click(screen.getByRole("button", { name: "+ New Center" }));
  return result;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Club Name/i), { target: { value: "Test Club" } });
  fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Dubai" } });
  fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: "123 Main St" } });
  fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: "25.2048" } });
  fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: "55.2708" } });
  // hoursOpen/hoursClose default to valid values (14:00 / 02:00)
  fireEvent.change(screen.getByLabelText(/Min Price/i), { target: { value: "50" } });
  fireEvent.change(screen.getByLabelText(/Max Price/i), { target: { value: "100" } });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("CreateCenterButton", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ id: "new-center-id" });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // 1. "+ New Center" button opens the drawer
  it("renders '+ New Center' button; clicking opens drawer", () => {
    render(<CreateCenterButton />);
    expect(screen.getByRole("button", { name: "+ New Center" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ New Center" }));
    expect(screen.getByText("New Center")).toBeTruthy();
  });

  // 2. Submit blocked when required fields empty
  it("shows validation error when name is empty on submit", async () => {
    renderAndOpen();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Create Center" }).closest("form")!);
    });
    expect(screen.getByRole("alert").textContent).toContain("Club name is required");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  // 3. HH:MM validation rejects bad time input
  it("shows validation error when hoursOpen is not HH:MM", async () => {
    renderAndOpen();
    fireEvent.change(screen.getByLabelText(/Club Name/i), { target: { value: "Test Club" } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: "Dubai" } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: "Addr" } });
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText(/Opens/i), { target: { value: "9:00" } });
    fireEvent.change(screen.getByLabelText(/Min Price/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/Max Price/i), { target: { value: "100" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Create Center" }).closest("form")!);
    });
    expect(screen.getByRole("alert").textContent).toContain("HH:MM");
  });

  // 4. AED → fils conversion: AED 50 → 5000 fils in POST body
  it("B1: converts AED to fils in POST body (AED 50 → 5000 fils)", async () => {
    renderAndOpen();
    fillRequiredFields();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Create Center" }).closest("form")!);
    });
    await act(async () => {});
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/admin/system/centers",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(apiFetchMock.mock.calls[0]![1].body);
    expect(body.priceMin).toBe(5000);
    expect(body.priceMax).toBe(10000);
  });

  // 5. Success path: POST fires with exact required fields + closes drawer
  it("B1: successful POST sends correct body and closes drawer", async () => {
    renderAndOpen();
    fillRequiredFields();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Create Center" }).closest("form")!);
    });
    await act(async () => {});
    const body = JSON.parse(apiFetchMock.mock.calls[0]![1].body);
    expect(body.name).toBe("Test Club");
    expect(body.city).toBe("Dubai");
    expect(body.lat).toBe(25.2048);
    expect(body.lng).toBe(55.2708);
    expect(body.hoursOpen).toBe("14:00");
    expect(body.hoursClose).toBe("02:00");
    // Drawer closed: form resets — name input is empty
    expect((screen.getByLabelText(/Club Name/i) as HTMLInputElement).value).toBe("");
  });

  // 6. priceMin > priceMax shows advisory error
  it("B1: blocks submit when priceMin > priceMax", async () => {
    renderAndOpen();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Min Price/i), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/Max Price/i), { target: { value: "50" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Create Center" }).closest("form")!);
    });
    expect(screen.getByRole("alert").textContent).toContain("≤ max");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  // 7. axe: no a11y violations on open drawer
  it("B1: axe passes on open drawer", async () => {
    const { container } = renderAndOpen();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
