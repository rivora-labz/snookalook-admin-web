import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../lib/datetime", () => ({
  formatDateShort: (n: number) => `d:${n}`,
  formatTime: (n: number) => `t:${n}`,
}));

import AgentGrid, { type AgentCardData } from "./AgentGrid";

const baseAgent: AgentCardData = {
  agent: "backend",
  lastReportName: "report.md",
  lastReportMtime: 1000,
  lastReportStatus: "COMPLETE",
  inboxPending: false,
};

describe("AgentGrid", () => {
  it("renders agent name", () => {
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.getByText("backend")).toBeTruthy();
  });

  it("shows inbox badge when inboxPending=true", () => {
    render(
      <AgentGrid
        agents={[{ ...baseAgent, inboxPending: true }]}
        onSpawn={vi.fn()}
        onCompose={vi.fn()}
      />,
    );
    expect(screen.getByText("inbox")).toBeTruthy();
  });

  it("no inbox badge when inboxPending=false", () => {
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.queryByText("inbox")).toBeNull();
  });

  it("shows status text", () => {
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.getByText("COMPLETE")).toBeTruthy();
  });

  it("shows 'no report' when lastReportStatus is null", () => {
    render(
      <AgentGrid
        agents={[{ ...baseAgent, lastReportStatus: null, lastReportMtime: null }]}
        onSpawn={vi.fn()}
        onCompose={vi.fn()}
      />,
    );
    expect(screen.getByText("no report")).toBeTruthy();
  });

  it("renders Spawn and Brief buttons", () => {
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.getByText("Spawn")).toBeTruthy();
    expect(screen.getByText("Brief")).toBeTruthy();
  });

  it("Brief button calls onCompose with agent name", () => {
    const onCompose = vi.fn();
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={onCompose} />);
    fireEvent.click(screen.getByText("Brief"));
    expect(onCompose).toHaveBeenCalledWith("backend");
  });

  it("Spawn button calls onSpawn with agent name", async () => {
    const onSpawn = vi.fn().mockResolvedValue(undefined);
    render(<AgentGrid agents={[baseAgent]} onSpawn={onSpawn} onCompose={vi.fn()} />);
    fireEvent.click(screen.getByText("Spawn"));
    expect(onSpawn).toHaveBeenCalledWith("backend");
  });

  it("renders multiple agents", () => {
    const agents: AgentCardData[] = [
      { ...baseAgent, agent: "mobile" },
      { ...baseAgent, agent: "ios" },
    ];
    render(<AgentGrid agents={agents} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.getByText("mobile")).toBeTruthy();
    expect(screen.getByText("ios")).toBeTruthy();
  });

  it("renders mtime using formatDateShort + formatTime", () => {
    render(<AgentGrid agents={[baseAgent]} onSpawn={vi.fn()} onCompose={vi.fn()} />);
    expect(screen.getByText("· d:1000 t:1000")).toBeTruthy();
  });
});
