import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RevenueAreaChart from "./RevenueAreaChart";

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
    AreaChart: make("areachart"),
    Area: make("area"),
    XAxis: make("xaxis"),
    YAxis: make("yaxis"),
    Tooltip: make("tooltip"),
    CartesianGrid: make("cartesiangrid"),
  };
});

const SAMPLE = [
  { date: "Mon", value: 1200 },
  { date: "Tue", value: 1800 },
  { date: "Wed", value: 900 },
];

function readProps(el: Element | null): Record<string, unknown> {
  if (!el) throw new Error("element missing");
  const raw = el.getAttribute("data-props");
  if (!raw) throw new Error("data-props missing");
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("RevenueAreaChart", () => {
  it("wraps content in ResponsiveContainer with full width/height", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const wrap = container.querySelector('[data-chart="responsive"]');
    const props = readProps(wrap);
    expect(props.width).toBe("100%");
    expect(props.height).toBe("100%");
  });

  it("renders AreaChart with data passed through", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const chart = container.querySelector('[data-chart="areachart"]');
    const props = readProps(chart);
    expect(props.data).toEqual(SAMPLE);
  });

  it("passes margin to AreaChart", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const chart = container.querySelector('[data-chart="areachart"]');
    const props = readProps(chart);
    expect(props.margin).toEqual({ top: 10, right: 10, left: -20, bottom: 0 });
  });

  it("defaults fillId to 'colorValue-analytics'", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const grad = container.querySelector("linearGradient");
    expect(grad?.getAttribute("id")).toBe("colorValue-analytics");
  });

  it("defaults stroke to '#D4AF37' on Area", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const area = container.querySelector('[data-chart="area"]');
    const props = readProps(area);
    expect(props.stroke).toBe("#D4AF37");
    expect(props.fill).toBe("url(#colorValue-analytics)");
  });

  it("honors custom fillId override", () => {
    const { container } = render(
      <RevenueAreaChart data={SAMPLE} fillId="custom-grad" />,
    );
    const grad = container.querySelector("linearGradient");
    expect(grad?.getAttribute("id")).toBe("custom-grad");
    const area = container.querySelector('[data-chart="area"]');
    expect(readProps(area).fill).toBe("url(#custom-grad)");
  });

  it("honors custom stroke override on Area + gradient stops", () => {
    const { container } = render(
      <RevenueAreaChart data={SAMPLE} stroke="#00ff00" />,
    );
    const area = container.querySelector('[data-chart="area"]');
    expect(readProps(area).stroke).toBe("#00ff00");
    const stops = container.querySelectorAll("stop");
    expect(stops.length).toBe(2);
    expect(stops[0]?.getAttribute("stop-color")).toBe("#00ff00");
    expect(stops[1]?.getAttribute("stop-color")).toBe("#00ff00");
  });

  it("renders gradient with two stops (40% fade to 0%)", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const stops = container.querySelectorAll("stop");
    expect(stops[0]?.getAttribute("offset")).toBe("5%");
    expect(stops[0]?.getAttribute("stop-opacity")).toBe("0.4");
    expect(stops[1]?.getAttribute("offset")).toBe("95%");
    expect(stops[1]?.getAttribute("stop-opacity")).toBe("0");
  });

  it("renders CartesianGrid + XAxis + YAxis + Tooltip exactly once each", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    expect(container.querySelectorAll('[data-chart="cartesiangrid"]').length).toBe(1);
    expect(container.querySelectorAll('[data-chart="xaxis"]').length).toBe(1);
    expect(container.querySelectorAll('[data-chart="yaxis"]').length).toBe(1);
    expect(container.querySelectorAll('[data-chart="tooltip"]').length).toBe(1);
  });

  it("binds XAxis to 'date' dataKey", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const xaxis = container.querySelector('[data-chart="xaxis"]');
    expect(readProps(xaxis).dataKey).toBe("date");
  });

  it("disables Area animation and binds to 'value' dataKey", () => {
    const { container } = render(<RevenueAreaChart data={SAMPLE} />);
    const area = container.querySelector('[data-chart="area"]');
    const props = readProps(area);
    expect(props.isAnimationActive).toBe(false);
    expect(props.dataKey).toBe("value");
    expect(props.type).toBe("monotone");
    expect(props.strokeWidth).toBe(2);
  });
});
