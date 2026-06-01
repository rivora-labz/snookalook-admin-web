import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const pathnameMock = vi.fn<() => string>();
const setDateRange = vi.fn();
const setIsBookingOpen = vi.fn();
const setIsActivityOpen = vi.fn();
const toggleTheme = vi.fn();
const useAdminMock = vi.fn();
const useThemeMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));
vi.mock("../lib/AdminContext", () => ({
  useAdmin: () => useAdminMock(),
}));
vi.mock("../lib/ThemeContext", () => ({
  useTheme: () => useThemeMock(),
}));
vi.mock("../lib/datetime", () => ({
  formatDate: () => "Monday, June",
}));
vi.mock("./Button", () => ({
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

beforeEach(() => {
  pathnameMock.mockReset();
  setDateRange.mockReset();
  setIsBookingOpen.mockReset();
  setIsActivityOpen.mockReset();
  toggleTheme.mockReset();
  useAdminMock.mockReturnValue({
    dateRange: "Today",
    setDateRange,
    setIsBookingOpen,
    setIsActivityOpen,
  });
  useThemeMock.mockReturnValue({ theme: "dark", toggleTheme });
  cleanup();
});

afterEach(() => cleanup());

async function renderHeader(pathname: string) {
  pathnameMock.mockReturnValue(pathname);
  const mod = await import("./AdminHeader");
  return render(<mod.default />);
}

describe("AdminHeader", () => {
  it("titles Dashboard for /dashboard", async () => {
    await renderHeader("/dashboard");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dashboard");
  });

  it("titles Tables for / root", async () => {
    await renderHeader("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tables");
  });

  it("titles Tables for /tables sub-route", async () => {
    await renderHeader("/tables/foo");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tables");
  });

  it("titles Bookings for /bookings sub-route", async () => {
    await renderHeader("/bookings/abc");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bookings");
  });

  it("titles Analytics for /analytics and /earnings", async () => {
    await renderHeader("/analytics");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Analytics");
    cleanup();
    await renderHeader("/earnings");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Analytics");
  });

  it("falls back to Dashboard title for unknown path", async () => {
    await renderHeader("/totally-unknown");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dashboard");
  });

  it("renders dateRange from context", async () => {
    useAdminMock.mockReturnValue({
      dateRange: "Last 7 days",
      setDateRange,
      setIsBookingOpen,
      setIsActivityOpen,
    });
    await renderHeader("/dashboard");
    expect(screen.getByText("Last 7 days")).toBeDefined();
  });

  it("date menu opens and selecting an option calls setDateRange", async () => {
    await renderHeader("/dashboard");
    fireEvent.click(screen.getByText("Today"));
    fireEvent.click(screen.getByText("Last 7 days"));
    expect(setDateRange).toHaveBeenCalledWith("Last 7 days");
  });

  it("Custom range... item sets dateRange + opens custom panel", async () => {
    await renderHeader("/dashboard");
    fireEvent.click(screen.getByText("Today"));
    fireEvent.click(screen.getByText("Custom range..."));
    expect(setDateRange).toHaveBeenCalledWith("Custom range...");
    expect(screen.getByText("Apply")).toBeDefined();
  });

  it("theme toggle button calls toggleTheme + title varies by theme", async () => {
    await renderHeader("/dashboard");
    fireEvent.click(screen.getByTitle("Switch to light mode"));
    expect(toggleTheme).toHaveBeenCalled();
  });

  it("Bell click opens activity drawer", async () => {
    await renderHeader("/dashboard");
    const bell = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("relative p-2") && !b.title);
    fireEvent.click(bell!);
    expect(setIsActivityOpen).toHaveBeenCalledWith(true);
  });

  it("New Booking button opens booking drawer", async () => {
    await renderHeader("/dashboard");
    fireEvent.click(screen.getByText("+ New Booking"));
    expect(setIsBookingOpen).toHaveBeenCalledWith(true);
  });
});
