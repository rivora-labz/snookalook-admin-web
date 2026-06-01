import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

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
    BarChart: make("barchart"),
    Bar: make("bar"),
    Cell: make("cell"),
    XAxis: make("xaxis"),
    YAxis: make("yaxis"),
    Tooltip: make("tooltip"),
    CartesianGrid: make("cartesian-grid"),
  };
});

import UtilizationBarChart from "./UtilizationBarChart";

type DataPoint = { hour: string; utilization: number; isPeak: boolean };

const DATA: DataPoint[] = [
  { hour: "10:00", utilization: 20, isPeak: false },
  { hour: "11:00", utilization: 60, isPeak: false },
  { hour: "12:00", utilization: 90, isPeak: true },
  { hour: "13:00", utilization: 85, isPeak: true },
  { hour: "14:00", utilization: 40, isPeak: false },
];

function propsOf<T>(container: HTMLElement, kind: string): T {
  const el = container.querySelector(`[data-chart="${kind}"]`);
  if (!el) throw new Error(`no chart kind ${kind}`);
  return JSON.parse(el.getAttribute("data-props") ?? "{}") as T;
}

describe("UtilizationBarChart", () => {
  it("wraps in ResponsiveContainer 100%/100%", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ width: string; height: string }>(container, "responsive");
    expect(p.width).toBe("100%");
    expect(p.height).toBe("100%");
  });

  it("BarChart receives data prop and tight left margin", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ data: DataPoint[]; margin: { top: number; right: number; left: number; bottom: number } }>(container, "barchart");
    expect(p.data).toHaveLength(DATA.length);
    expect(p.margin).toEqual({ top: 10, right: 10, left: -25, bottom: 0 });
  });

  it("XAxis dataKey is hour with 11px tick fill #808080", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ dataKey: string; tick: { fontSize: number; fill: string } }>(container, "xaxis");
    expect(p.dataKey).toBe("hour");
    expect(p.tick).toEqual({ fontSize: 11, fill: "#808080" });
  });

  it("YAxis domain is fixed [0, 100]", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ domain: [number, number] }>(container, "yaxis");
    expect(p.domain).toEqual([0, 100]);
  });

  it("CartesianGrid hides vertical lines with dashed stroke", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ strokeDasharray: string; vertical: boolean }>(container, "cartesian-grid");
    expect(p.strokeDasharray).toBe("3 3");
    expect(p.vertical).toBe(false);
  });

  it("Bar dataKey is utilization with disabled animation", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ dataKey: string; isAnimationActive: boolean; radius: number[] }>(container, "bar");
    expect(p.dataKey).toBe("utilization");
    expect(p.isAnimationActive).toBe(false);
    expect(p.radius).toEqual([4, 4, 0, 0]);
  });

  it("renders one Cell per data point", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    expect(container.querySelectorAll('[data-chart="cell"]').length).toBe(DATA.length);
  });

  it("Cell fill uses gold gradient for peak entries", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const cells = Array.from(container.querySelectorAll('[data-chart="cell"]'));
    DATA.forEach((entry, i) => {
      const p = JSON.parse(cells[i]!.getAttribute("data-props") ?? "{}") as { fill: string };
      const expected = entry.isPeak ? "url(#barGold-analytics)" : "url(#barGreen-analytics)";
      expect(p.fill).toBe(expected);
    });
  });

  it("custom greenId/goldId propagate to Cell fills", () => {
    const { container } = render(
      <UtilizationBarChart data={[DATA[0]!, DATA[2]!]} greenId="custom-green" goldId="custom-gold" />,
    );
    const cells = Array.from(container.querySelectorAll('[data-chart="cell"]'));
    expect(JSON.parse(cells[0]!.getAttribute("data-props")!).fill).toBe("url(#custom-green)");
    expect(JSON.parse(cells[1]!.getAttribute("data-props")!).fill).toBe("url(#custom-gold)");
  });

  it("Tooltip cursor + contentStyle wired through", () => {
    const { container } = render(<UtilizationBarChart data={DATA} />);
    const p = propsOf<{ cursor: { fill: string }; contentStyle: Record<string, string>; itemStyle: Record<string, string>; formatter: string }>(container, "tooltip");
    expect(p.cursor).toEqual({ fill: "rgba(255,255,255,0.05)" });
    expect(p.contentStyle.borderRadius).toBe("8px");
    expect(p.itemStyle.color).toBe("var(--th-text)");
    expect(p.formatter).toBe("[fn]");
  });

  it("renders without crashing on empty data", () => {
    const { container } = render(<UtilizationBarChart data={[]} />);
    expect(container.querySelector('[data-chart="barchart"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-chart="cell"]').length).toBe(0);
  });
});
