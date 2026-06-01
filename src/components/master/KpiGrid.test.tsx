import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import KpiGrid, { KpiCard } from "./KpiGrid";

describe("KpiCard", () => {
  it("renders label + value", () => {
    const { getByText } = render(<KpiCard label="Revenue" value="AED 12,345" />);
    expect(getByText("Revenue")).toBeInTheDocument();
    expect(getByText("AED 12,345")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    const { getByText } = render(<KpiCard label="Bookings" value={42} />);
    expect(getByText("42")).toBeInTheDocument();
  });

  it("renders sub when provided", () => {
    const { getByText } = render(
      <KpiCard label="Tables" value={8} sub="vs 6 yesterday" />,
    );
    expect(getByText("vs 6 yesterday")).toBeInTheDocument();
  });

  it("omits sub when not provided", () => {
    const { queryByText } = render(<KpiCard label="Tables" value={8} />);
    expect(queryByText("vs 6 yesterday")).toBeNull();
  });

  it("applies neutral accent class by default", () => {
    const { container } = render(<KpiCard label="X" value="0" />);
    expect(container.firstElementChild?.className).toContain("border-l-th-border");
  });

  it.each([
    ["gold", "border-l-[#D4AF37]"],
    ["green", "border-l-[#2ECC71]"],
    ["red", "border-l-[#E74C3C]"],
    ["blue", "border-l-[#3498DB]"],
    ["neutral", "border-l-th-border"],
  ] as const)("applies %s accent class", (accent, cls) => {
    const { container } = render(<KpiCard label="X" value="0" accent={accent} />);
    expect(container.firstElementChild?.className).toContain(cls);
  });
});

describe("KpiGrid", () => {
  it("renders children", () => {
    const { getByText } = render(
      <KpiGrid>
        <KpiCard label="A" value="1" />
        <KpiCard label="B" value="2" />
      </KpiGrid>,
    );
    expect(getByText("A")).toBeInTheDocument();
    expect(getByText("B")).toBeInTheDocument();
  });

  it("applies responsive grid classes", () => {
    const { container } = render(
      <KpiGrid>
        <span>x</span>
      </KpiGrid>,
    );
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("grid");
    expect(cls).toContain("grid-cols-1");
    expect(cls).toContain("md:grid-cols-2");
    expect(cls).toContain("lg:grid-cols-4");
  });
});
