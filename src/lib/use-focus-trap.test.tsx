import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFocusTrap } from "./use-focus-trap";

function TrapHarness({ active, onEscape }: { active: boolean; onEscape?: () => void }) {
  const ref = useFocusTrap<HTMLDivElement>(active, onEscape);
  return (
    <div>
      <button>outside-before</button>
      <div ref={ref} data-testid="trap">
        <button>first</button>
        <button>middle</button>
        <button>last</button>
      </div>
      <button>outside-after</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("autofocuses the first focusable element when active flips true", () => {
    render(<TrapHarness active />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "first" }));
  });

  it("cycles Tab from last back to first", async () => {
    const user = userEvent.setup();
    render(<TrapHarness active />);
    const last = screen.getByRole("button", { name: "last" });
    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "first" }));
  });

  it("cycles Shift+Tab from first back to last", async () => {
    const user = userEvent.setup();
    render(<TrapHarness active />);
    const first = screen.getByRole("button", { name: "first" });
    first.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "last" }));
  });

  it("fires onEscape when ESC pressed", async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(<TrapHarness active onEscape={onEscape} />);
    await user.keyboard("{Escape}");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
