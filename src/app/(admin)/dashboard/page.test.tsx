import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

const apiSpy = vi.fn();

vi.mock("../../../lib/api", () => ({
  apiFetchRetry: (...args: unknown[]) => apiSpy(...args),
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
  formatAED: (n: unknown) => String(n),
  formatDate: (d: unknown) => String(d),
  formatDateShort: (d: unknown) => String(d),
}));

vi.mock("../../../lib/AdminContext", () => ({
  useAdmin: () => ({ dateRange: null }),
}));

vi.mock("../../../components/DashboardKpiRow", () => ({ default: () => null }));
vi.mock("../../../components/LiveTableStatus", () => ({ default: () => null }));
vi.mock("../../../components/SchedulePanel", () => ({ default: () => null }));
vi.mock("../../../components/ActivityStrip", () => ({ default: () => null }));

import DashboardPage from "./page";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

describe("DashboardPage visibility-gated polling (W4.3)", () => {
  beforeEach(() => {
    apiSpy.mockReset();
    apiSpy.mockResolvedValue({
      tablesInUse: "0",
      activeBookings: "0",
      revenueToday: "0",
      newPlayersThisWeek: "0",
    });
    setVisibility("visible");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches once on mount", async () => {
    await act(async () => {
      render(<DashboardPage />);
    });
    expect(apiSpy).toHaveBeenCalledTimes(1);
    expect(apiSpy).toHaveBeenCalledWith(
      "/admin/dashboard/kpis",
      undefined,
      { retries: 2 },
    );
  });

  it("does NOT fetch on 30s tick when tab is hidden", async () => {
    await act(async () => {
      render(<DashboardPage />);
    });
    apiSpy.mockClear();

    setVisibility("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(apiSpy).not.toHaveBeenCalled();

    // Two ticks hidden — still nothing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("fetches on 30s tick when tab is visible", async () => {
    await act(async () => {
      render(<DashboardPage />);
    });
    apiSpy.mockClear();

    setVisibility("visible");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(apiSpy).toHaveBeenCalledTimes(1);
  });

  it("resumes fetching when tab transitions hidden → visible at next tick", async () => {
    await act(async () => {
      render(<DashboardPage />);
    });
    apiSpy.mockClear();

    setVisibility("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(apiSpy).not.toHaveBeenCalled();

    setVisibility("visible");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(apiSpy).toHaveBeenCalledTimes(1);
  });

  it("clears interval on unmount (no orphan polling)", async () => {
    let utils: ReturnType<typeof render> | undefined;
    await act(async () => {
      utils = render(<DashboardPage />);
    });
    apiSpy.mockClear();
    utils!.unmount();

    setVisibility("visible");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(apiSpy).not.toHaveBeenCalled();
  });
});
