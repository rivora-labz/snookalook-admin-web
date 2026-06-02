import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, className, "aria-label": ariaLabel }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => React.createElement("a", { href, className, "aria-label": ariaLabel }, children),
}));

import OnboardingChecklist, { type ChecklistStep } from "./OnboardingChecklist";

const steps: ChecklistStep[] = [
  { id: "s1", title: "Add a table", description: "Set up your first table", href: "/tables", done: false },
  { id: "s2", title: "Configure hours", description: "Set opening hours", href: "/settings", done: false },
  { id: "s3", title: "Invite staff", description: "Add team members", href: "/team", done: true },
];

describe("OnboardingChecklist", () => {
  it("renders Setup Checklist heading", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.getByText("Setup Checklist")).toBeTruthy();
  });

  it("renders correct completed count text", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.getByText("1/3 complete")).toBeTruthy();
  });

  it("renders all step titles", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.getByText("Add a table")).toBeTruthy();
    expect(screen.getByText("Configure hours")).toBeTruthy();
    expect(screen.getByText("Invite staff")).toBeTruthy();
  });

  it("done step has DONE badge", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.getByText("DONE")).toBeTruthy();
  });

  it("done step has no skip button", () => {
    const onSkip = vi.fn();
    render(<OnboardingChecklist steps={steps} onSkip={onSkip} />);
    const skipButtons = screen.queryAllByText("Skip this step");
    expect(skipButtons.length).toBe(2);
  });

  it("skipped step has SKIPPED badge", () => {
    const stepsWithSkip: ChecklistStep[] = [
      { id: "s1", title: "Step 1", description: "desc", href: "/tables", done: false, skipped: true },
    ];
    render(<OnboardingChecklist steps={stepsWithSkip} />);
    expect(screen.getByText("SKIPPED")).toBeTruthy();
  });

  it("skip button calls onSkip with step id", () => {
    const onSkip = vi.fn();
    render(<OnboardingChecklist steps={steps} onSkip={onSkip} />);
    const skipButtons = screen.getAllByText("Skip this step");
    fireEvent.click(skipButtons[0]!);
    expect(onSkip).toHaveBeenCalledWith("s1");
  });

  it("no skip buttons when onSkip not provided", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.queryAllByText("Skip this step").length).toBe(0);
  });

  it("shows todo text when step has todo and is not done", () => {
    const stepsWithTodo: ChecklistStep[] = [
      { id: "s1", title: "Step 1", description: "desc", href: "/tables", done: false, todo: "Fix the config" },
    ];
    render(<OnboardingChecklist steps={stepsWithTodo} />);
    expect(screen.getByText("TODO: Fix the config")).toBeTruthy();
  });

  it("does not show todo text when step is done", () => {
    const doneWithTodo: ChecklistStep[] = [
      { id: "s1", title: "Step 1", description: "desc", href: "/tables", done: true, todo: "Should not show" },
    ];
    render(<OnboardingChecklist steps={doneWithTodo} />);
    expect(screen.queryByText("TODO: Should not show")).toBeNull();
  });

  it("progress bar width reflects completion percentage", () => {
    const { container } = render(<OnboardingChecklist steps={steps} />);
    const bar = container.querySelector(".bg-th-gold") as HTMLElement;
    expect(bar.style.width).toBe("33%");
  });
});
