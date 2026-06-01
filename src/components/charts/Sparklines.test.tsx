import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

// Capture all recharts elements as plain divs so we can inspect props.
vi.mock("recharts", () => {
  const make = (kind: string) =>
    function ChartShim(props: AnyProps) {
      const { children, ...rest } = props;
      return (
        <div
          data-chart={kind}
          data-props={JSON.stringify(
            rest,
            // strip functions / dom nodes for safe serialization
            (_k, v) => (typeof v === "function" ? "[fn]" : v),
          )}
        >
          {children}
        </div>
      );
    };
  return {
    ResponsiveContainer: make("responsive"),
    BarChart: make("barchart"),
    Bar: make("bar"),
    LineChart: make("linechart"),
    Line: make("line"),
    AreaChart: make("areachart"),
    Area: make("area"),
  };
});

import SparklineBar from "./SparklineBar";
import SparklineLine from "./SparklineLine";
import SparklineArea from "./SparklineArea";

function chart(container: HTMLElement, kind: string): HTMLElement {
  const el = container.querySelector(`[data-chart="${kind}"]`);
  if (!el) throw new Error(`no chart of kind ${kind}`);
  return el as HTMLElement;
}
function chartProps<T = AnyProps>(container: HTMLElement, kind: string): T {
  return JSON.parse(chart(container, kind).getAttribute("data-props") ?? "{}") as T;
}

const DATA = [
  { i: 0, v: 1 },
  { i: 1, v: 3 },
  { i: 2, v: 2 },
];

describe("SparklineBar", () => {
  it("renders Bar with default fill + height 40", () => {
    const { container } = render(<SparklineBar data={DATA} />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 40 });
    expect(chartProps(container, "bar")).toMatchObject({
      dataKey: "v",
      fill: "#3498DB",
    });
  });

  it("forwards custom fill + height", () => {
    const { container } = render(<SparklineBar data={DATA} fill="#FF00FF" height={120} />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 120 });
    expect(chartProps(container, "bar")).toMatchObject({ fill: "#FF00FF" });
  });

  it("disables Bar animation (avoid flaky tests downstream)", () => {
    const { container } = render(<SparklineBar data={DATA} />);
    expect(chartProps(container, "bar")).toMatchObject({ isAnimationActive: false });
  });
});

describe("SparklineLine", () => {
  it("renders Line with default stroke + height 40", () => {
    const { container } = render(<SparklineLine data={DATA} />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 40 });
    expect(chartProps(container, "line")).toMatchObject({
      dataKey: "v",
      stroke: "#D4AF37",
      strokeWidth: 1.5,
      type: "monotone",
      dot: false,
    });
  });

  it("forwards custom stroke + height", () => {
    const { container } = render(<SparklineLine data={DATA} stroke="#123456" height={80} />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 80 });
    expect(chartProps(container, "line")).toMatchObject({ stroke: "#123456" });
  });

  it("disables Line animation", () => {
    const { container } = render(<SparklineLine data={DATA} />);
    expect(chartProps(container, "line")).toMatchObject({ isAnimationActive: false });
  });
});

describe("SparklineArea", () => {
  it("renders Area w/ default props + 'val' dataKey", () => {
    const { container } = render(<SparklineArea data={[{ val: 1 }, { val: 2 }]} />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 40 });
    expect(chartProps(container, "area")).toMatchObject({
      dataKey: "val",
      stroke: "#D4AF37",
      strokeWidth: 1.5,
      fill: "url(#goldGradient)",
      dot: false,
      isAnimationActive: false,
    });
  });

  it("forwards custom stroke + fillId (gradient URL ref tracks fillId)", () => {
    const { container } = render(
      <SparklineArea data={[{ v: 1 }]} stroke="#ABCDEF" fillId="customGrad" dataKey="v" />,
    );
    const areaProps = chartProps<{ dataKey: string; stroke: string; fill: string }>(
      container,
      "area",
    );
    expect(areaProps).toMatchObject({
      dataKey: "v",
      stroke: "#ABCDEF",
      fill: "url(#customGrad)",
    });
  });

  it("renders <linearGradient> with matching id under <defs>", () => {
    const { container } = render(<SparklineArea data={[{ val: 1 }]} fillId="grad-x" />);
    const grad = container.querySelector("linearGradient");
    expect(grad).not.toBeNull();
    expect(grad?.getAttribute("id")).toBe("grad-x");
  });

  it("allows custom height + dataKey='v'", () => {
    const { container } = render(<SparklineArea data={[{ v: 1 }]} height={100} dataKey="v" />);
    expect(chartProps(container, "responsive")).toMatchObject({ height: 100 });
    expect(chartProps(container, "area")).toMatchObject({ dataKey: "v" });
  });
});
