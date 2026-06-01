import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  SkBox,
  SkLine,
  PageHeaderSkeleton,
  KpiRowSkeleton,
  TableSkeleton,
  CardGridSkeleton,
  ChartSkeleton,
} from "./PageSkeleton";

describe("PageSkeleton primitives", () => {
  it("SkBox uses default classes and merges custom className", () => {
    const { container } = render(<SkBox className="h-8 w-16" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("bg-th-card");
    expect(el.className).toContain("rounded-lg");
    expect(el.className).toContain("h-8 w-16");
  });

  it("SkBox renders without className override", () => {
    const { container } = render(<SkBox />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("rounded-lg");
  });

  it("SkLine uses default h-4 w-32 when no className passed", () => {
    const { container } = render(<SkLine />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-32");
    expect(el.className).toContain("animate-pulse");
  });

  it("SkLine omits default size when custom className provided", () => {
    const { container } = render(<SkLine className="h-2 w-8" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("h-2");
    expect(el.className).toContain("w-8");
    expect(el.className).not.toContain("h-4 w-32");
  });
});

describe("PageHeaderSkeleton", () => {
  it("renders 2 SkLines + 1 SkBox in the header layout", () => {
    const { container } = render(<PageHeaderSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(3);
  });
});

describe("KpiRowSkeleton", () => {
  it("renders 4 cards by default with 3 SkLines each (12 pulses total)", () => {
    const { container } = render(<KpiRowSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(12);
  });

  it("renders the configured count and sets gridTemplateColumns accordingly", () => {
    const { container } = render(<KpiRowSkeleton count={6} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(18);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(6, minmax(0, 1fr))");
  });
});

describe("TableSkeleton", () => {
  it("defaults to 8 rows × 5 cols (45 SkLine cells = 5 header + 40 body)", () => {
    const { container } = render(<TableSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(45);
  });

  it("respects custom rows and cols", () => {
    const { container } = render(<TableSkeleton rows={3} cols={4} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(4 + 3 * 4);
  });
});

describe("CardGridSkeleton", () => {
  it("renders 6 cards by default with 6 pulses each (36 pulses total)", () => {
    const { container } = render(<CardGridSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(36);
  });

  it("renders the configured card count", () => {
    const { container } = render(<CardGridSkeleton count={2} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(12);
  });
});

describe("ChartSkeleton", () => {
  it("renders header line + 12 bars by default with h-64 height", () => {
    const { container } = render(<ChartSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses).toHaveLength(13);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("h-64");
  });

  it("accepts a custom height prop", () => {
    const { container } = render(<ChartSkeleton height="h-96" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("h-96");
    expect(root.className).not.toContain("h-64");
  });
});
