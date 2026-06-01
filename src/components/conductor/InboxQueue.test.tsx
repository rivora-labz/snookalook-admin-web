import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InboxQueue, { type InboxItem } from "./InboxQueue";

vi.mock("../../lib/datetime", () => ({
  formatTime: (input: number) => `T@${input}`,
}));

const inline: InboxItem = {
  agent: "admin-web",
  sizeBytes: 1024,
  mtime: 1780283950,
  isPointer: false,
  pointerTarget: null,
};

const pointer: InboxItem = {
  agent: "deploy",
  sizeBytes: 0,
  mtime: 1780283960,
  isPointer: true,
  pointerTarget: "agents/inbox/principal-deploy-burst25.md",
};

describe("InboxQueue", () => {
  it("renders empty state when items array is empty", () => {
    const onDelete = vi.fn();
    const { container } = render(<InboxQueue items={[]} onDelete={onDelete} />);
    expect(container.textContent).toContain("Inbox empty.");
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders one <li> per item in supplied order", () => {
    const { container } = render(
      <InboxQueue items={[inline, pointer]} onDelete={vi.fn()} />,
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("admin-web");
    expect(items[1]!.textContent).toContain("deploy");
  });

  it("renders agent name in monospace pill", () => {
    const { container } = render(
      <InboxQueue items={[inline]} onDelete={vi.fn()} />,
    );
    const pill = container.querySelector("span.font-mono");
    expect(pill).toBeTruthy();
    expect(pill!.textContent).toBe("admin-web");
  });

  it("shows '<bytes>B inline' badge for non-pointer items", () => {
    const { container } = render(
      <InboxQueue items={[inline]} onDelete={vi.fn()} />,
    );
    expect(container.textContent).toContain("1024B inline");
    expect(container.textContent).not.toContain("→");
  });

  it("shows '→ <target>' label for pointer items with a target", () => {
    const { container } = render(
      <InboxQueue items={[pointer]} onDelete={vi.fn()} />,
    );
    expect(container.textContent).toContain(
      "→ agents/inbox/principal-deploy-burst25.md",
    );
    expect(container.textContent).not.toContain("inline");
  });

  it("hides pointer arrow when isPointer is true but pointerTarget is null", () => {
    const orphan: InboxItem = {
      agent: "ghost",
      sizeBytes: 0,
      mtime: 1,
      isPointer: true,
      pointerTarget: null,
    };
    const { container } = render(
      <InboxQueue items={[orphan]} onDelete={vi.fn()} />,
    );
    expect(container.textContent).not.toContain("→");
    expect(container.textContent).not.toContain("inline");
  });

  it("passes mtime through formatTime helper for the timestamp slot", () => {
    const { container } = render(
      <InboxQueue items={[inline]} onDelete={vi.fn()} />,
    );
    expect(container.textContent).toContain("T@1780283950");
  });

  it("renders a 'skip' button for each item", () => {
    render(<InboxQueue items={[inline, pointer]} onDelete={vi.fn()} />);
    const buttons = screen.getAllByRole("button", { name: "skip" });
    expect(buttons).toHaveLength(2);
  });

  it("skip button title surfaces the non-destructive rename hint", () => {
    render(<InboxQueue items={[inline]} onDelete={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "skip" });
    expect(btn.getAttribute("title")).toBe("Rename to .skip (non-destructive)");
  });

  it("clicking skip invokes onDelete with that row's agent name", () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<InboxQueue items={[inline, pointer]} onDelete={onDelete} />);
    const buttons = screen.getAllByRole("button", { name: "skip" });
    fireEvent.click(buttons[1]!);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("deploy");
  });

  it("pointer-target span exposes full path via title attribute (truncated render)", () => {
    const { container } = render(
      <InboxQueue items={[pointer]} onDelete={vi.fn()} />,
    );
    const span = container.querySelector('span[title]');
    expect(span?.getAttribute("title")).toBe(
      "agents/inbox/principal-deploy-burst25.md",
    );
    expect(span?.className).toContain("truncate");
  });
});
