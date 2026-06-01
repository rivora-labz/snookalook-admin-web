import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

let pathnameMock = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className }, children),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: {
    src: string; alt: string; width?: number; height?: number;
  }) => React.createElement("img", { src, alt, width, height }),
}));

vi.mock("../lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}));

vi.mock("../lib/runtime-auth", () => ({
  getRuntimeAuthMode: () => "backend",
}));

vi.mock("../app/actions/admin-token", () => ({
  clearAdminAccessTokenCookie: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  session: {
    centerName: "Test Club",
    userDisplayName: "Jane Admin",
    role: "FOUNDER",
  },
}));

vi.mock("../lib/use-staff-session", () => ({
  useStaffSession: () => sessionMock,
}));

vi.mock("phosphor-react", () => ({
  SquaresFour: () => React.createElement("span", { "data-icon": "SquaresFour" }),
  GridFour: () => React.createElement("span", { "data-icon": "GridFour" }),
  Calendar: () => React.createElement("span", { "data-icon": "Calendar" }),
  Users: () => React.createElement("span", { "data-icon": "Users" }),
  ChartLineUp: () => React.createElement("span", { "data-icon": "ChartLineUp" }),
  CreditCard: () => React.createElement("span", { "data-icon": "CreditCard" }),
  Gear: () => React.createElement("span", { "data-icon": "Gear" }),
  SignOut: () => React.createElement("span", { "data-icon": "SignOut" }),
  Trophy: () => React.createElement("span", { "data-icon": "Trophy" }),
}));

import AdminNav from "./AdminNav";

describe("AdminNav", () => {
  it("renders brand name", () => {
    pathnameMock = "/dashboard";
    render(<AdminNav />);
    expect(screen.getByText("Snook A Look")).toBeTruthy();
  });

  it("renders all nav item labels", () => {
    pathnameMock = "/dashboard";
    render(<AdminNav />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Tables")).toBeTruthy();
    expect(screen.getByText("Bookings")).toBeTruthy();
    expect(screen.getByText("Players")).toBeTruthy();
    expect(screen.getByText("Analytics")).toBeTruthy();
    expect(screen.getByText("Leaderboard")).toBeTruthy();
    expect(screen.getByText("Payments")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("active exact-match nav item gets gold text class", () => {
    pathnameMock = "/dashboard";
    const { container } = render(<AdminNav />);
    const dashboardLink = container.querySelector('a[href="/dashboard"]')!;
    expect(dashboardLink.className).toContain("text-[#D4AF37]");
  });

  it("inactive nav item gets tertiary text class", () => {
    pathnameMock = "/dashboard";
    const { container } = render(<AdminNav />);
    const bookingsLink = container.querySelector('a[href="/bookings"]')!;
    expect(bookingsLink.className).toContain("text-th-text-tertiary");
    expect(bookingsLink.className).not.toContain("text-[#D4AF37]");
  });

  it("active startsWith match highlights nav item", () => {
    pathnameMock = "/bookings/history";
    const { container } = render(<AdminNav />);
    const bookingsLink = container.querySelector('a[href="/bookings"]')!;
    expect(bookingsLink.className).toContain("text-[#D4AF37]");
  });

  it("renders center name from session", () => {
    render(<AdminNav />);
    expect(screen.getByText("Test Club")).toBeTruthy();
  });

  it("renders user display name from session", () => {
    render(<AdminNav />);
    expect(screen.getByText("Jane Admin")).toBeTruthy();
  });

  it("renders role from session", () => {
    render(<AdminNav />);
    expect(screen.getByText("FOUNDER")).toBeTruthy();
  });

  it("renders sign out button", () => {
    render(<AdminNav />);
    const btn = screen.getByTitle("Sign out");
    expect(btn).toBeTruthy();
  });

  it("renders Admin badge", () => {
    render(<AdminNav />);
    expect(screen.getByText("Admin")).toBeTruthy();
  });
});
