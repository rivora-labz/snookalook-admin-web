import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import Drawer from "./Drawer";

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => {
    return useRef<HTMLDivElement>(null);
  },
}));

describe("Drawer", () => {
  it("renders dialog role and title when open", () => {
    render(
      <Drawer isOpen onClose={() => {}} title="Edit Booking">
        <p>body</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Booking")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <Drawer isOpen onClose={() => {}} title="t">
        <span data-testid="child">hello-child</span>
      </Drawer>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello-child");
  });

  it("dialog has aria-modal=true and aria-labelledby pointing at title", () => {
    render(
      <Drawer isOpen onClose={() => {}} title="My Title">
        <p>body</p>
      </Drawer>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId!)?.textContent).toBe("My Title");
  });

  it("close button invokes onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer isOpen onClose={onClose} title="t">
        <p>body</p>
      </Drawer>
    );
    const closeBtn = screen
      .getAllByRole("button")
      .find((b) => b.querySelector("svg"));
    expect(closeBtn).toBeTruthy();
    await user.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("overlay click invokes onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Drawer isOpen onClose={onClose} title="t">
        <p>body</p>
      </Drawer>
    );
    const overlay = container.querySelector(".bg-black\\/60");
    expect(overlay).toBeTruthy();
    await user.click(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses default width 420px when not provided", () => {
    render(
      <Drawer isOpen onClose={() => {}} title="t">
        <p>body</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "420px" });
  });

  it("uses custom width when provided", () => {
    render(
      <Drawer isOpen onClose={() => {}} title="t" width="600px">
        <p>body</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "600px" });
  });

  it("locks body scroll while open and unlocks on unmount", () => {
    const { unmount } = render(
      <Drawer isOpen onClose={() => {}} title="t">
        <p>body</p>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("unset");
  });

  it("does not lock body scroll when isOpen=false", () => {
    document.body.style.overflow = "unset";
    render(
      <Drawer isOpen={false} onClose={() => {}} title="t">
        <p>body</p>
      </Drawer>
    );
    expect(document.body.style.overflow).toBe("unset");
  });
});
