import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import UtilizationHeatmap, { type UtilizationGrid, type UtilizationCell } from "./UtilizationHeatmap";

const cell = (booked: number, total: number): UtilizationCell => ({ bookedSlots: booked, totalSlots: total });

function emptyGrid(): UtilizationGrid {
  return { grid: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null)) };
}

function gridWith(d: number, h: number, c: UtilizationCell): UtilizationGrid {
  const g = emptyGrid();
  g.grid[d]![h] = c;
  return g;
}

describe("UtilizationHeatmap", () => {
  afterEach(() => cleanup());

  it("renders title", () => {
    render(<UtilizationHeatmap data={null} loading={false} />);
    expect(screen.getByText("Utilization Heatmap")).toBeInTheDocument();
  });

  it("shows pulse placeholder when loading", () => {
    const { container } = render(<UtilizationHeatmap data={null} loading={true} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText(/Unable to load/)).not.toBeInTheDocument();
  });

  it("shows error fallback when data null + not loading", () => {
    render(<UtilizationHeatmap data={null} loading={false} />);
    expect(screen.getByText("Unable to load utilization data.")).toBeInTheDocument();
  });

  it("renders 7 day rows when data present", () => {
    render(<UtilizationHeatmap data={emptyGrid()} loading={false} />);
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      // Day label appears in sr-only summary AND visible row label
      expect(screen.getAllByText(d).length).toBeGreaterThan(0);
    }
  });

  it("renders aria-label with overall utilization percentage", () => {
    const g = emptyGrid();
    g.grid[0]![10] = cell(5, 10); // 50%
    g.grid[1]![10] = cell(5, 10);
    render(<UtilizationHeatmap data={g} loading={false} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toContain("50% utilized");
    expect(img.getAttribute("aria-label")).toContain("10 of 20 slots booked");
  });

  it("populated cell has aria-label day/hour/booked/total", () => {
    const g = gridWith(2, 14, cell(3, 8));
    render(<UtilizationHeatmap data={g} loading={false} />);
    expect(screen.getByLabelText("Wed 14: 3/8")).toBeInTheDocument();
  });

  it("empty cell (totalSlots=0) has NO aria-label", () => {
    const g = gridWith(0, 0, cell(0, 0));
    render(<UtilizationHeatmap data={g} loading={false} />);
    expect(screen.queryByLabelText(/^Mon 0:/)).not.toBeInTheDocument();
  });

  it("mouseEnter on cell shows tooltip with day/hour/pct", () => {
    const g = gridWith(3, 9, cell(4, 8)); // Thu 09:00, 50%
    render(<UtilizationHeatmap data={g} loading={false} />);
    const td = screen.getByLabelText("Thu 9: 4/8");
    fireEvent.mouseEnter(td);
    expect(screen.getByText(/Thu 09:00 — 4\/8 slots booked = 50%/)).toBeInTheDocument();
  });

  it("mouseLeave clears tooltip", () => {
    const g = gridWith(3, 9, cell(4, 8));
    render(<UtilizationHeatmap data={g} loading={false} />);
    const td = screen.getByLabelText("Thu 9: 4/8");
    fireEvent.mouseEnter(td);
    expect(screen.getByText(/Thu 09:00/)).toBeInTheDocument();
    fireEvent.mouseLeave(td);
    expect(screen.queryByText(/Thu 09:00/)).not.toBeInTheDocument();
  });

  it("sr-only daily summary renders pct per day", () => {
    const g = emptyGrid();
    g.grid[0]![10] = cell(10, 10); // Mon 100%
    render(<UtilizationHeatmap data={g} loading={false} />);
    expect(screen.getByText(/100% \(10 of 10 slots\)/)).toBeInTheDocument();
  });

  it("color buckets — high utilization (>=80%) uses #0B3D2E", () => {
    const g = gridWith(0, 5, cell(9, 10)); // 90%
    render(<UtilizationHeatmap data={g} loading={false} />);
    const td = screen.getByLabelText("Mon 5: 9/10") as HTMLElement;
    expect(td.style.backgroundColor).toBe("rgb(11, 61, 46)");
  });

  it("color buckets — low utilization (<20%) uses #E74C3C", () => {
    const g = gridWith(0, 5, cell(1, 10)); // 10%
    render(<UtilizationHeatmap data={g} loading={false} />);
    const td = screen.getByLabelText("Mon 5: 1/10") as HTMLElement;
    expect(td.style.backgroundColor).toBe("rgb(231, 76, 60)");
  });
});
