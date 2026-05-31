import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import QuickLinkCard from "./QuickLinkCard";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe("QuickLinkCard", () => {
  it("renders title text", () => {
    render(
      <QuickLinkCard
        href={"/dashboard" as never}
        title="Dashboard"
        description="View KPIs"
      />
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(
      <QuickLinkCard
        href={"/dashboard" as never}
        title="Dashboard"
        description="View KPIs"
      />
    );
    expect(screen.getByText("View KPIs")).toBeInTheDocument();
  });

  it("renders as an anchor with the provided href", () => {
    render(
      <QuickLinkCard
        href={"/bookings" as never}
        title="Bookings"
        description="Manage reservations"
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/bookings");
  });

  it("renders directional arrow indicator", () => {
    render(
      <QuickLinkCard
        href={"/bookings" as never}
        title="Bookings"
        description="Manage"
      />
    );
    expect(screen.getByText("→")).toBeInTheDocument();
  });
});
