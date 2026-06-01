import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const usePathnameMock = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import MasterNav from "./MasterNav";

const ITEMS = [
  { href: "/master/overview", label: "Overview" },
  { href: "/master/centers", label: "Centers" },
  { href: "/master/leads", label: "Leads" },
  { href: "/master/newsletter", label: "Newsletter" },
  { href: "/master/careers", label: "Careers" },
  { href: "/master/waitlist", label: "Waitlist" },
  { href: "/master/audit", label: "Audit Log" },
  { href: "/master/versions", label: "Versions" },
] as const;

const ACTIVE_CLASSES = ["bg-[#D4AF37]/10", "text-[#D4AF37]", "border-l-2", "border-[#D4AF37]"];

describe("MasterNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    cleanup();
  });

  it("renders Snook A Look brand header", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    expect(screen.getByText("Snook A Look")).toBeInTheDocument();
  });

  it("renders God View badge", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    expect(screen.getByText("God View")).toBeInTheDocument();
  });

  it("renders all 8 nav item labels", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    for (const { label } of ITEMS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it.each(ITEMS)("renders %s as a link to %s", ({ href, label }) => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    const link = screen.getByText(label).closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(href);
  });

  it("marks active item when pathname matches exactly", () => {
    usePathnameMock.mockReturnValue("/master/centers");
    render(<MasterNav />);
    const link = screen.getByText("Centers").closest("a")!;
    for (const cls of ACTIVE_CLASSES) {
      expect(link.className).toContain(cls);
    }
  });

  it("marks active item when pathname is a subroute (startsWith)", () => {
    usePathnameMock.mockReturnValue("/master/centers/abc-123/edit");
    render(<MasterNav />);
    const link = screen.getByText("Centers").closest("a")!;
    for (const cls of ACTIVE_CLASSES) {
      expect(link.className).toContain(cls);
    }
  });

  it("does not mark inactive items as active", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    const inactive = screen.getByText("Leads").closest("a")!;
    expect(inactive.className).not.toContain("bg-[#D4AF37]/10");
    expect(inactive.className).toContain("text-th-text-tertiary");
  });

  it("renders aside container", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    const { container } = render(<MasterNav />);
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain("w-[240px]");
  });

  it("renders nav element wrapping items", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    const { container } = render(<MasterNav />);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll("a").length).toBe(ITEMS.length);
  });

  it("active styling on /master/overview exact match", () => {
    usePathnameMock.mockReturnValue("/master/overview");
    render(<MasterNav />);
    const overview = screen.getByText("Overview").closest("a")!;
    expect(overview.className).toContain("bg-[#D4AF37]/10");
  });

  it("no active item when pathname is unrelated", () => {
    usePathnameMock.mockReturnValue("/something-else");
    render(<MasterNav />);
    for (const { label } of ITEMS) {
      const link = screen.getByText(label).closest("a")!;
      expect(link.className).not.toContain("bg-[#D4AF37]/10");
    }
  });

  it("does not falsely activate sibling prefix (e.g. /master/cent != /master/centers)", () => {
    usePathnameMock.mockReturnValue("/master/cent");
    render(<MasterNav />);
    const centers = screen.getByText("Centers").closest("a")!;
    expect(centers.className).not.toContain("bg-[#D4AF37]/10");
  });
});
