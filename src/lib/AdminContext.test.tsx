import { describe, it, expect } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { AdminProvider, useAdmin } from "./AdminContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}

describe("AdminProvider + useAdmin", () => {
  it("provides default state (Today / both drawers closed)", () => {
    const { result } = renderHook(() => useAdmin(), { wrapper });
    expect(result.current.dateRange).toBe("Today");
    expect(result.current.isBookingOpen).toBe(false);
    expect(result.current.isActivityOpen).toBe(false);
  });

  it("setDateRange updates dateRange", () => {
    const { result } = renderHook(() => useAdmin(), { wrapper });
    act(() => result.current.setDateRange("Last 7 days"));
    expect(result.current.dateRange).toBe("Last 7 days");
  });

  it("setIsBookingOpen toggles booking drawer", () => {
    const { result } = renderHook(() => useAdmin(), { wrapper });
    act(() => result.current.setIsBookingOpen(true));
    expect(result.current.isBookingOpen).toBe(true);
    act(() => result.current.setIsBookingOpen(false));
    expect(result.current.isBookingOpen).toBe(false);
  });

  it("setIsActivityOpen toggles activity drawer independently", () => {
    const { result } = renderHook(() => useAdmin(), { wrapper });
    act(() => {
      result.current.setIsActivityOpen(true);
      result.current.setIsBookingOpen(false);
    });
    expect(result.current.isActivityOpen).toBe(true);
    expect(result.current.isBookingOpen).toBe(false);
  });

  it("useAdmin throws when called outside an AdminProvider", () => {
    expect(() => renderHook(() => useAdmin())).toThrow(
      /useAdmin must be used within an AdminProvider/,
    );
  });

  it("renders children inside provider", () => {
    const { getByText } = render(
      <AdminProvider>
        <span>child</span>
      </AdminProvider>,
    );
    expect(getByText("child")).toBeInTheDocument();
  });

  it("preserves identity of state across unrelated updates", () => {
    const { result } = renderHook(() => useAdmin(), { wrapper });
    act(() => result.current.setDateRange("Last 30 days"));
    expect(result.current.isBookingOpen).toBe(false);
    expect(result.current.isActivityOpen).toBe(false);
    act(() => result.current.setIsBookingOpen(true));
    expect(result.current.dateRange).toBe("Last 30 days");
  });
});
