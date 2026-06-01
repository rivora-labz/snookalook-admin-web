import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick} disabled>Disabled</Button>);
    await user.click(screen.getByRole("button", { name: "Disabled" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies primary variant class by default", () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole("button").className).toContain("bg-th-gold");
  });

  it("applies danger variant class", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button").className).toContain("bg-[#E74C3C]");
  });

  it("applies size class (sm/md/lg)", () => {
    const { rerender } = render(<Button size="sm">S</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");
    rerender(<Button size="lg">L</Button>);
    expect(screen.getByRole("button").className).toContain("h-11");
  });

  it("forwards arbitrary props (aria-label, type)", () => {
    render(<Button aria-label="Submit form" type="submit">X</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Submit form");
    expect(btn).toHaveAttribute("type", "submit");
  });
});
