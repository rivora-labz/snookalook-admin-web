import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonText, SkeletonCard } from "./Skeleton";

describe("Skeleton primitives", () => {
  it("Skeleton renders status role with aria-busy", () => {
    render(<Skeleton className="h-4 w-12" />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAttribute("aria-label", "Loading");
    expect(el.className).toContain("animate-pulse");
  });

  it("Skeleton applies rounded variants statically", () => {
    const { rerender } = render(<Skeleton rounded="full" />);
    expect(screen.getByRole("status").className).toContain("rounded-full");
    rerender(<Skeleton rounded="sm" />);
    expect(screen.getByRole("status").className).toContain("rounded-sm");
  });

  it("SkeletonText renders the requested number of bars", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const wrapper = container.querySelector('[aria-label="Loading text"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.children.length).toBe(5);
  });

  it("SkeletonCard renders with explicit height style", () => {
    render(<SkeletonCard height={200} />);
    const card = screen.getAllByRole("status")[0];
    expect(card).toHaveAttribute("aria-busy", "true");
  });
});
