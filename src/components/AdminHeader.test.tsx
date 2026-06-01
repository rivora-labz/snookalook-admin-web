import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

let pathnameMock = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
}));

const adminMocks = vi.hoisted(() => ({
  setDateRange: vi.fn(),
  setIsBookingOpen: vi.fn(),
  setIsActivityOpen: vi.fn(),
  dateRange: "Today",
}));

vi.mock("../lib/AdminContext", () => ({
  useAdmin: () => ({
    dateRange: adminMocks.dateRange,
    setDateRange: adminMocks.setDateRange,
    setIsBookingOpen: adminMocks.setIsBookingOpen,
    setIsActivityOpen: adminMocks.setIsActivityOpen,
  }),
}));

const themeMocks = vi.hoisted(() => ({
  theme: "dark" as "dark" | "light",
  toggleTheme: vi.fn(),
}));

vi.mock("../lib/ThemeContext", () => ({
  useTheme: () => ({
    theme: themeMocks.theme,
    toggleTheme: themeMocks.toggleTheme,
  }),
}));

vi.mock("../lib/datetime", () => ({
  formatDate: () => "Monday, January",
}));

vi.mock("phosphor-react", () => ({
  MagnifyingGlass: () => React.createElement("span", { "data-icon": "MagnifyingGlass" }),
  Calendar: () => React.createElement("span", { "data-icon": "Calendar" }),
  Bell: () => React.createElement("span", { "data-icon": "Bell" }),
  CaretDown: () => React.createElement("span", { "data-icon": "CaretDown" }),
  Check: () => React.createElement("span", { "data-icon": "Check" }),
  Sun: () => React.createElement("span", { "data-icon": "Sun" }),
  Moon: () => React.createElement("span", { "data-icon": "Moon" }),
}));

vi.mock("./Button", () => ({
  default: ({ children, onClick, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => React.createElement("button", { onClick, className }, children),
}));

import AdminHeader from "./AdminHeader";

describe("AdminHeader", () => {
  it("renders page title for /dashboard pathname", () => {
    pathnameMock = "/dashboard";
    render(<AdminHeader />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("renders 'Tables' title for / pathname", () => {
    pathnameMock = "/";
    render(<AdminHeader />);
    expect(screen.getByText("Tables")).toBeTruthy();
  });

  it("renders 'Bookings' title for /bookings pathname", () => {
    pathnameMock = "/bookings";
    render(<AdminHeader />);
    expect(screen.getByText("Bookings")).toBeTruthy();
  });

  it("renders 'Analytics' title for /analytics pathname", () => {
    pathnameMock = "/analytics";
    render(<AdminHeader />);
    expect(screen.getByText("Analytics")).toBeTruthy();
  });

  it("renders formatted date", () => {
    pathnameMock = "/dashboard";
    render(<AdminHeader />);
    expect(screen.getByText("Monday, January")).toBeTruthy();
  });

  it("renders current dateRange label", () => {
    pathnameMock = "/dashboard";
    render(<AdminHeader />);
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("renders search input", () => {
    pathnameMock = "/dashboard";
    render(<AdminHeader />);
    expect(screen.getByPlaceholderText(/Search bookings/)).toBeTruthy();
  });

  it("renders New Booking button", () => {
    pathnameMock = "/dashboard";
    render(<AdminHeader />);
    expect(screen.getByText("+ New Booking")).toBeTruthy();
  });

  it("clicking New Booking calls setIsBookingOpen(true)", () => {
    pathnameMock = "/dashboard";
    adminMocks.setIsBookingOpen.mockClear();
    render(<AdminHeader />);
    fireEvent.click(screen.getByText("+ New Booking"));
    expect(adminMocks.setIsBookingOpen).toHaveBeenCalledWith(true);
  });

  it("clicking Bell calls setIsActivityOpen(true)", () => {
    pathnameMock = "/dashboard";
    adminMocks.setIsActivityOpen.mockClear();
    const { container } = render(<AdminHeader />);
    const bellBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.querySelector("[data-icon='Bell']"),
    )!;
    fireEvent.click(bellBtn);
    expect(adminMocks.setIsActivityOpen).toHaveBeenCalledWith(true);
  });

  it("clicking theme button calls toggleTheme", () => {
    pathnameMock = "/dashboard";
    themeMocks.toggleTheme.mockClear();
    const { container } = render(<AdminHeader />);
    const themeBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.title === "Switch to light mode" || b.title === "Switch to dark mode",
    )!;
    fireEvent.click(themeBtn);
    expect(themeMocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it("date dropdown shows options on click", () => {
    pathnameMock = "/dashboard";
    const { container } = render(<AdminHeader />);
    const dateBtn = container.querySelector("button.rounded-full")!;
    fireEvent.click(dateBtn);
    expect(screen.getByText("Yesterday")).toBeTruthy();
    expect(screen.getByText("Last 7 days")).toBeTruthy();
  });

  it("selecting a date option calls setDateRange", () => {
    pathnameMock = "/dashboard";
    adminMocks.setDateRange.mockClear();
    const { container } = render(<AdminHeader />);
    const dateBtn = container.querySelector("button.rounded-full")!;
    fireEvent.click(dateBtn);
    fireEvent.click(screen.getByText("Last 7 days"));
    expect(adminMocks.setDateRange).toHaveBeenCalledWith("Last 7 days");
  });
});
