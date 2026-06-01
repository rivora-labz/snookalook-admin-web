import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// recharts mock — same pattern as RevenueAreaChart + UtilizationBarChart tests.
// Each component renders as a div with data-chart={kind} + JSON-serialized props.
type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

vi.mock("recharts", () => {
  const make = (kind: string) =>
    function ChartShim(props: AnyProps) {
      const { children, ...rest } = props;
      return (
        <div
          data-chart={kind}
          data-props={JSON.stringify(rest, (_k, v) => (typeof v === "function" ? "[fn]" : v))}
        >
          {children}
        </div>
      );
    };
  return {
    ResponsiveContainer: make("responsive"),
    PieChart: make("piechart"),
    Pie: make("pie"),
    Cell: make("cell"),
    Tooltip: make("tooltip"),
  };
});

import SourcePieChart from "./SourcePieChart";

const SAMPLE = [
  { id: "instagram", name: "Instagram", value: 45, color: "#E1306C" },
  { id: "tiktok", name: "TikTok", value: 30, color: "#000000" },
  { id: "google", name: "Google", value: 25, color: "#4285F4" },
];

describe("SourcePieChart", () => {
  it("renders ResponsiveContainer with 100% width and height", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const resp = container.querySelector('[data-chart="responsive"]');
    expect(resp).toBeTruthy();
    const props = JSON.parse(resp!.getAttribute("data-props")!);
    expect(props.width).toBe("100%");
    expect(props.height).toBe("100%");
  });

  it("nests a PieChart inside the responsive container", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const pieChart = container.querySelector('[data-chart="piechart"]');
    expect(pieChart).toBeTruthy();
  });

  it("renders a Pie with correct centering + ring geometry", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const pie = container.querySelector('[data-chart="pie"]');
    expect(pie).toBeTruthy();
    const props = JSON.parse(pie!.getAttribute("data-props")!);
    expect(props.cx).toBe("50%");
    expect(props.cy).toBe("50%");
    expect(props.innerRadius).toBe(80);
    expect(props.outerRadius).toBe(110);
    expect(props.paddingAngle).toBe(2);
    expect(props.dataKey).toBe("value");
    expect(props.stroke).toBe("none");
  });

  it("disables Pie animation so chart paints synchronously", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const pie = container.querySelector('[data-chart="pie"]');
    const props = JSON.parse(pie!.getAttribute("data-props")!);
    expect(props.isAnimationActive).toBe(false);
  });

  it("passes the data array into the Pie unchanged", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const pie = container.querySelector('[data-chart="pie"]');
    const props = JSON.parse(pie!.getAttribute("data-props")!);
    expect(props.data).toEqual(SAMPLE);
  });

  it("renders one Cell per slice in slice order", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const cells = container.querySelectorAll('[data-chart="cell"]');
    expect(cells).toHaveLength(SAMPLE.length);
    cells.forEach((cell, i) => {
      const props = JSON.parse(cell.getAttribute("data-props")!);
      expect(props.fill).toBe(SAMPLE[i]!.color);
    });
  });

  it("renders zero Cells when data array is empty", () => {
    const { container } = render(<SourcePieChart data={[]} />);
    const cells = container.querySelectorAll('[data-chart="cell"]');
    expect(cells).toHaveLength(0);
  });

  it("propagates color from each slice to its Cell fill", () => {
    const custom = [
      { id: "a", name: "A", value: 50, color: "#FF0000" },
      { id: "b", name: "B", value: 50, color: "#00FF00" },
    ];
    const { container } = render(<SourcePieChart data={custom} />);
    const cells = container.querySelectorAll('[data-chart="cell"]');
    const fills = Array.from(cells).map((c) => JSON.parse(c.getAttribute("data-props")!).fill);
    expect(fills).toEqual(["#FF0000", "#00FF00"]);
  });

  it("renders a Tooltip with themed content/item styles", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const tooltip = container.querySelector('[data-chart="tooltip"]');
    expect(tooltip).toBeTruthy();
    const props = JSON.parse(tooltip!.getAttribute("data-props")!);
    expect(props.contentStyle).toMatchObject({
      backgroundColor: "var(--th-card)",
      border: "1px solid var(--th-border-medium)",
      borderRadius: "8px",
    });
    expect(props.itemStyle).toMatchObject({ color: "var(--th-text)" });
  });

  it("serializes the Tooltip formatter as a function-shim string", () => {
    const { container } = render(<SourcePieChart data={SAMPLE} />);
    const tooltip = container.querySelector('[data-chart="tooltip"]');
    const props = JSON.parse(tooltip!.getAttribute("data-props")!);
    expect(props.formatter).toBe("[fn]");
  });

  it("survives single-slice data without crashing", () => {
    const single = [{ id: "x", name: "Only", value: 100, color: "#111111" }];
    const { container } = render(<SourcePieChart data={single} />);
    const cells = container.querySelectorAll('[data-chart="cell"]');
    expect(cells).toHaveLength(1);
    const props = JSON.parse(cells[0]!.getAttribute("data-props")!);
    expect(props.fill).toBe("#111111");
  });
});
