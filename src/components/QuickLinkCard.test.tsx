import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className }, children),
}));

import QuickLinkCard from "./QuickLinkCard";

describe("QuickLinkCard", () => {
  it("renders title text", () => {
    render(<QuickLinkCard href="/tables" title="Tables" description="Manage tables" />);
    expect(screen.getByText("Tables")).toBeTruthy();
  });

  it("renders description text", () => {
    render(<QuickLinkCard href="/tables" title="Tables" description="Manage tables" />);
    expect(screen.getByText("Manage tables")).toBeTruthy();
  });

  it("renders correct href on link", () => {
    const { container } = render(
      <QuickLinkCard href="/bookings" title="Bookings" description="View bookings" />,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/bookings");
  });

  it("link has border and card bg classes", () => {
    const { container } = render(
      <QuickLinkCard href="/x" title="X" description="desc" />,
    );
    const link = container.querySelector("a")!;
    expect(link.className).toContain("border-th-divider");
    expect(link.className).toContain("bg-th-card");
  });
});
