import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../lib/datetime", () => ({
  formatDateShort: (n: number) => `d:${n}`,
  formatTime: (n: number) => `t:${n}`,
}));

import ReportsFeed, { type ReportItem } from "./ReportsFeed";

const baseItem: ReportItem = {
  name: "qa-mobile-report.md",
  agent: "qa-mobile",
  status: "COMPLETE",
  phase: null,
  mtime: 5000,
  sizeBytes: 1024,
};

describe("ReportsFeed", () => {
  it("renders empty state when items is empty", () => {
    render(<ReportsFeed items={[]} onSelect={vi.fn()} selected={null} />);
    expect(screen.getByText("No reports.")).toBeTruthy();
  });

  it("renders report name", () => {
    render(<ReportsFeed items={[baseItem]} onSelect={vi.fn()} selected={null} />);
    expect(screen.getByText("qa-mobile-report.md")).toBeTruthy();
  });

  it("renders agent badge when agent is set", () => {
    render(<ReportsFeed items={[baseItem]} onSelect={vi.fn()} selected={null} />);
    expect(screen.getByText("qa-mobile")).toBeTruthy();
  });

  it("no agent badge when agent is null", () => {
    render(
      <ReportsFeed
        items={[{ ...baseItem, agent: null }]}
        onSelect={vi.fn()}
        selected={null}
      />,
    );
    expect(screen.queryByText("qa-mobile")).toBeNull();
  });

  it("renders formatted mtime", () => {
    render(<ReportsFeed items={[baseItem]} onSelect={vi.fn()} selected={null} />);
    expect(screen.getByText("d:5000 t:5000")).toBeTruthy();
  });

  it("clicking item calls onSelect with report name", () => {
    const onSelect = vi.fn();
    render(<ReportsFeed items={[baseItem]} onSelect={onSelect} selected={null} />);
    fireEvent.click(screen.getByText("qa-mobile-report.md"));
    expect(onSelect).toHaveBeenCalledWith("qa-mobile-report.md");
  });

  it("selected item gets bg-th-hover class", () => {
    const { container } = render(
      <ReportsFeed items={[baseItem]} onSelect={vi.fn()} selected="qa-mobile-report.md" />,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("bg-th-hover");
  });

  it("non-selected item does not have bg-th-hover from selection", () => {
    const { container } = render(
      <ReportsFeed items={[baseItem]} onSelect={vi.fn()} selected={null} />,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className.split(" ")).not.toContain("bg-th-hover");
  });

  it("renders multiple items", () => {
    const items: ReportItem[] = [
      { ...baseItem, name: "report-a.md", mtime: 1 },
      { ...baseItem, name: "report-b.md", mtime: 2 },
    ];
    render(<ReportsFeed items={items} onSelect={vi.fn()} selected={null} />);
    expect(screen.getByText("report-a.md")).toBeTruthy();
    expect(screen.getByText("report-b.md")).toBeTruthy();
  });
});
