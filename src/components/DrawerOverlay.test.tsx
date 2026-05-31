import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DrawerOverlay from "./DrawerOverlay";

describe("DrawerOverlay", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <DrawerOverlay isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders overlay when isOpen is true", () => {
    const { container } = render(
      <DrawerOverlay isOpen={true} onClose={() => {}} />
    );
    expect(container.firstChild).not.toBeNull();
    expect((container.firstChild as HTMLElement).className).toContain("fixed");
    expect((container.firstChild as HTMLElement).className).toContain("inset-0");
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <DrawerOverlay isOpen={true} onClose={onClose} />
    );
    await user.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when not rendered (isOpen=false)", async () => {
    const onClose = vi.fn();
    render(<DrawerOverlay isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
