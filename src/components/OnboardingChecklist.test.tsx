import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingChecklist, { type ChecklistStep } from "./OnboardingChecklist";
import type { Route } from "next";

const step = (over: Partial<ChecklistStep> = {}): ChecklistStep => ({
  id: "s1",
  title: "Add first table",
  description: "Configure your tables",
  href: "/master/centers" as Route,
  done: false,
  ...over,
});

describe("OnboardingChecklist", () => {
  it("renders heading + completion count", () => {
    render(
      <OnboardingChecklist
        steps={[step(), step({ id: "s2", done: true }), step({ id: "s3" })]}
      />
    );
    expect(screen.getByText(/setup checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/3 complete/)).toBeInTheDocument();
  });

  it("counts skipped steps in completion", () => {
    render(
      <OnboardingChecklist
        steps={[
          step(),
          step({ id: "s2", skipped: true }),
          step({ id: "s3", done: true }),
        ]}
      />
    );
    expect(screen.getByText(/2\/3 complete/)).toBeInTheDocument();
  });

  it("renders progress bar width from percent", () => {
    const { container } = render(
      <OnboardingChecklist
        steps={[step({ done: true }), step({ id: "s2" })]}
      />
    );
    const bar = container.querySelector(".bg-th-gold");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("renders step title + description", () => {
    render(<OnboardingChecklist steps={[step({ title: "Pick a plan", description: "Choose tier" })]} />);
    expect(screen.getByText("Pick a plan")).toBeInTheDocument();
    expect(screen.getByText("Choose tier")).toBeInTheDocument();
  });

  it("shows DONE pill + checkmark on done step", () => {
    render(<OnboardingChecklist steps={[step({ done: true })]} />);
    expect(screen.getByText("DONE")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows SKIPPED pill + dash on skipped-only step", () => {
    render(<OnboardingChecklist steps={[step({ skipped: true })]} />);
    expect(screen.getByText("SKIPPED")).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("renders TODO note for non-done non-skipped step with todo", () => {
    render(<OnboardingChecklist steps={[step({ todo: "needs verification" })]} />);
    expect(screen.getByText(/TODO: needs verification/)).toBeInTheDocument();
  });

  it("does NOT render TODO note on done step", () => {
    render(<OnboardingChecklist steps={[step({ done: true, todo: "x" })]} />);
    expect(screen.queryByText(/TODO:/)).not.toBeInTheDocument();
  });

  it("renders Skip button only when incomplete + non-skipped + onSkip provided", () => {
    render(
      <OnboardingChecklist
        steps={[
          step({ id: "active" }),
          step({ id: "done-x", done: true }),
          step({ id: "skipped-x", skipped: true }),
        ]}
        onSkip={() => {}}
      />
    );
    const skipBtns = screen.getAllByRole("button", { name: /skip this step/i });
    expect(skipBtns.length).toBe(1);
  });

  it("does NOT render Skip buttons when onSkip absent", () => {
    render(<OnboardingChecklist steps={[step()]} />);
    expect(screen.queryByRole("button", { name: /skip this step/i })).not.toBeInTheDocument();
  });

  it("Skip click invokes onSkip with step.id", async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(
      <OnboardingChecklist steps={[step({ id: "abc-step" })]} onSkip={onSkip} />
    );
    await user.click(screen.getByRole("button", { name: /skip this step/i }));
    expect(onSkip).toHaveBeenCalledWith("abc-step");
  });

  it("each step renders Link with href", () => {
    const { container } = render(
      <OnboardingChecklist
        steps={[step({ href: "/master/centers" as Route }), step({ id: "s2", href: "/master/audit" as Route })]}
      />
    );
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(2);
    expect(anchors[0]).toHaveAttribute("href", "/master/centers");
    expect(anchors[1]).toHaveAttribute("href", "/master/audit");
  });
});
