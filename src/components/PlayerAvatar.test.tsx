import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, onError, className, width, height }: {
    src: string;
    alt: string;
    onError?: () => void;
    className?: string;
    width?: number;
    height?: number;
  }) => React.createElement("img", { src, alt, onError, className, width, height }),
}));

import PlayerAvatar from "./PlayerAvatar";

describe("PlayerAvatar", () => {
  it("renders img when url is provided", () => {
    const { container } = render(
      <PlayerAvatar url="https://cdn.example.com/avatar.png" name="Alice" />,
    );
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("renders first-letter initial when url is null", () => {
    const { container } = render(<PlayerAvatar url={null} name="Bob" />);
    expect(container.textContent).toBe("B");
    expect(container.querySelector("img")).toBeNull();
  });

  it("initial is uppercase", () => {
    const { container } = render(<PlayerAvatar url={null} name="carol" />);
    expect(container.textContent).toBe("C");
  });

  it("falls back to initial after image onError", () => {
    const { container } = render(
      <PlayerAvatar url="https://cdn.example.com/broken.png" name="Dave" />,
    );
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(container.textContent).toBe("D");
    expect(container.querySelector("img")).toBeNull();
  });

  it("applies size as width + height style", () => {
    const { container } = render(<PlayerAvatar url={null} name="Eve" size={48} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.width).toBe("48px");
    expect(div.style.height).toBe("48px");
  });

  it("uses text-sm class when size > 32", () => {
    const { container } = render(<PlayerAvatar url={null} name="Eve" size={40} />);
    expect(container.firstElementChild!.className).toContain("text-sm");
  });

  it("uses text-xs class when size <= 32", () => {
    const { container } = render(<PlayerAvatar url={null} name="Eve" size={32} />);
    expect(container.firstElementChild!.className).toContain("text-xs");
  });

  it("applies custom bgColor as background-color style", () => {
    const { container } = render(
      <PlayerAvatar url={null} name="Frank" bgColor="#FF0000" />,
    );
    expect((container.firstElementChild as HTMLElement).style.backgroundColor).toBe(
      "rgb(255, 0, 0)",
    );
  });

  it("applies custom className to wrapper div", () => {
    const { container } = render(
      <PlayerAvatar url={null} name="Grace" className="ring-2" />,
    );
    expect(container.firstElementChild!.className).toContain("ring-2");
  });
});
