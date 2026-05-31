import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerAvatar from "./PlayerAvatar";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe("PlayerAvatar", () => {
  it("renders initial when url is null", () => {
    const { container } = render(<PlayerAvatar url={null} name="alice" />);
    expect(container.textContent).toBe("A");
    expect(container.querySelector("img")).toBeNull();
  });

  it("uppercases the initial", () => {
    const { container } = render(<PlayerAvatar url={null} name="zoe" />);
    expect(container.textContent).toBe("Z");
  });

  it("renders image when url is provided", () => {
    render(<PlayerAvatar url="https://example.com/a.png" name="alice" />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("falls back to initial when image errors", () => {
    const { container } = render(
      <PlayerAvatar url="https://example.com/broken.png" name="alice" />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    fireEvent.error(img);
    expect(container.textContent).toBe("A");
    expect(container.querySelector("img")).toBeNull();
  });

  it("applies custom size to container", () => {
    const { container } = render(
      <PlayerAvatar url={null} name="alice" size={64} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("64px");
    expect(el.style.height).toBe("64px");
  });

  it("applies custom bgColor", () => {
    const { container } = render(
      <PlayerAvatar url={null} name="alice" bgColor="#FF0000" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.backgroundColor).toBe("rgb(255, 0, 0)");
  });
});
