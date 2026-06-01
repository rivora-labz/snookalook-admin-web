import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("phosphor-react", () => ({
  X: () => <span data-testid="x-icon" />,
}));

import Drawer from "./Drawer";

describe("Drawer", () => {
  it("renders role=dialog with aria-modal=true", () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()} title="Test">
        content
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("renders title text", () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Booking Detail">
        content
      </Drawer>,
    );
    expect(screen.getByText("Booking Detail")).toBeTruthy();
  });

  it("renders children content", () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="T">
        <p>child node</p>
      </Drawer>,
    );
    expect(screen.getByText("child node")).toBeTruthy();
  });

  it("isOpen=true: panel has translateX(0) transform", () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="T">
        x
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.style.transform).toBe("translateX(0)");
  });

  it("isOpen=false: panel has translateX(100%) transform", () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()} title="T">
        x
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.style.transform).toBe("translateX(100%)");
  });

  it("isOpen=true: overlay is opacity-100", () => {
    const { container } = render(
      <Drawer isOpen={true} onClose={vi.fn()} title="T">
        x
      </Drawer>,
    );
    const overlay = container.querySelector(".bg-black\\/60")!;
    expect(overlay.className).toContain("opacity-100");
  });

  it("isOpen=false: overlay is opacity-0 pointer-events-none", () => {
    const { container } = render(
      <Drawer isOpen={false} onClose={vi.fn()} title="T">
        x
      </Drawer>,
    );
    const overlay = container.querySelector(".bg-black\\/60")!;
    expect(overlay.className).toContain("opacity-0");
    expect(overlay.className).toContain("pointer-events-none");
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer isOpen={true} onClose={onClose} title="T">
        x
      </Drawer>,
    );
    const closeBtn = container.querySelector("button")!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking overlay calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer isOpen={true} onClose={onClose} title="T">
        x
      </Drawer>,
    );
    const overlay = container.querySelector(".bg-black\\/60")!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies custom width style to panel", () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="T" width="600px">
        x
      </Drawer>,
    );
    expect(screen.getByRole("dialog").style.width).toBe("600px");
  });
});
