import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import DrawerOverlay from "./DrawerOverlay";

describe("DrawerOverlay", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(<DrawerOverlay isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders overlay div when isOpen is true", () => {
    const { container } = render(<DrawerOverlay isOpen={true} onClose={vi.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("overlay has fixed positioning class", () => {
    const { container } = render(<DrawerOverlay isOpen={true} onClose={vi.fn()} />);
    expect((container.firstChild as HTMLElement).className).toContain("fixed");
  });

  it("clicking overlay calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<DrawerOverlay isOpen={true} onClose={onClose} />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when isOpen is false (not rendered)", () => {
    const onClose = vi.fn();
    const { container } = render(<DrawerOverlay isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
