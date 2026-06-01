import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UtilizationHeatmap, { type UtilizationGrid } from "./UtilizationHeatmap";

const emptyGrid: UtilizationGrid = {
  grid: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null)),
};

const singleCellGrid: UtilizationGrid = {
  grid: Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) =>
      d === 0 && h === 9 ? { bookedSlots: 3, totalSlots: 4 } : null,
    ),
  ),
};

describe("UtilizationHeatmap", () => {
  it("renders Utilization Heatmap heading", () => {
    render(<UtilizationHeatmap data={emptyGrid} loading={false} />);
    expect(screen.getByText("Utilization Heatmap")).toBeTruthy();
  });

  it("loading=true: shows pulse skeleton instead of grid", () => {
    const { container } = render(<UtilizationHeatmap data={null} loading={true} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("loading=false, data=null: shows error text", () => {
    render(<UtilizationHeatmap data={null} loading={false} />);
    expect(screen.getByText("Unable to load utilization data.")).toBeTruthy();
  });

  it("renders role=img with aria-label when data is present", () => {
    render(<UtilizationHeatmap data={emptyGrid} loading={false} />);
    expect(screen.getByRole("img")).toBeTruthy();
  });

  it("aria-label contains utilization percentage", () => {
    render(<UtilizationHeatmap data={singleCellGrid} loading={false} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toContain("75%");
  });

  it("renders day labels in grid", () => {
    render(<UtilizationHeatmap data={emptyGrid} loading={false} />);
    expect(screen.getAllByText("Mon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sun").length).toBeGreaterThanOrEqual(1);
  });

  it("cell aria-label shows booking info", () => {
    render(<UtilizationHeatmap data={singleCellGrid} loading={false} />);
    expect(screen.getByLabelText("Mon 9: 3/4")).toBeTruthy();
  });

  it("hover shows tooltip text", () => {
    const { container } = render(<UtilizationHeatmap data={singleCellGrid} loading={false} />);
    const cell = container.querySelector("td[aria-label='Mon 9: 3/4']")!;
    fireEvent.mouseEnter(cell);
    expect(screen.getByText(/Mon 09:00.*3\/4 slots/)).toBeTruthy();
  });

  it("mouse leave clears tooltip", () => {
    const { container } = render(<UtilizationHeatmap data={singleCellGrid} loading={false} />);
    const cell = container.querySelector("td[aria-label='Mon 9: 3/4']")!;
    fireEvent.mouseEnter(cell);
    fireEvent.mouseLeave(cell);
    expect(screen.queryByText(/Mon 09:00/)).toBeNull();
  });
});
