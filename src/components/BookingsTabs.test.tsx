import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BookingsTabs from "./BookingsTabs";

const pathnameMock = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

describe("BookingsTabs", () => {
  it("renders both tab labels", () => {
    pathnameMock.mockReturnValue("/bookings");
    render(<BookingsTabs />);
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("renders both tabs as Link with correct href", () => {
    pathnameMock.mockReturnValue("/bookings");
    const { container } = render(<BookingsTabs />);
    const anchors = container.querySelectorAll("a");
    expect(anchors[0]).toHaveAttribute("href", "/bookings");
    expect(anchors[1]).toHaveAttribute("href", "/bookings/history");
  });

  it("marks Calendar active when pathname=/bookings", () => {
    pathnameMock.mockReturnValue("/bookings");
    render(<BookingsTabs />);
    expect(screen.getByText("Calendar").className).toMatch(/bg-th-elevated/);
    expect(screen.getByText("History").className).toMatch(/text-th-text-tertiary/);
  });

  it("marks History active when pathname=/bookings/history", () => {
    pathnameMock.mockReturnValue("/bookings/history");
    render(<BookingsTabs />);
    expect(screen.getByText("History").className).toMatch(/bg-th-elevated/);
    expect(screen.getByText("Calendar").className).toMatch(/text-th-text-tertiary/);
  });

  it("marks neither active when pathname is unrelated", () => {
    pathnameMock.mockReturnValue("/somewhere-else");
    render(<BookingsTabs />);
    expect(screen.getByText("Calendar").className).toMatch(/text-th-text-tertiary/);
    expect(screen.getByText("History").className).toMatch(/text-th-text-tertiary/);
  });
});
