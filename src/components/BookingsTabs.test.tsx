import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

let pathnameMock = "/bookings";

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

import BookingsTabs from "./BookingsTabs";

describe("BookingsTabs", () => {
  it("renders both tab labels", () => {
    pathnameMock = "/bookings";
    render(<BookingsTabs />);
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("History")).toBeTruthy();
  });

  it("renders hrefs /bookings and /bookings/history", () => {
    pathnameMock = "/bookings";
    const { container } = render(<BookingsTabs />);
    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/bookings");
    expect(hrefs).toContain("/bookings/history");
  });

  it("active tab (/bookings) has elevated bg class", () => {
    pathnameMock = "/bookings";
    const { container } = render(<BookingsTabs />);
    const calendarLink = container.querySelector('a[href="/bookings"]')!;
    expect(calendarLink.className).toContain("bg-th-elevated");
  });

  it("inactive tab (/bookings/history) has tertiary text class", () => {
    pathnameMock = "/bookings";
    const { container } = render(<BookingsTabs />);
    const historyLink = container.querySelector('a[href="/bookings/history"]')!;
    expect(historyLink.className).toContain("text-th-text-tertiary");
    expect(historyLink.className).not.toContain("bg-th-elevated");
  });

  it("swaps active when pathname is /bookings/history", () => {
    pathnameMock = "/bookings/history";
    const { container } = render(<BookingsTabs />);
    expect(container.querySelector('a[href="/bookings/history"]')!.className).toContain("bg-th-elevated");
    expect(container.querySelector('a[href="/bookings"]')!.className).toContain("text-th-text-tertiary");
  });
});
