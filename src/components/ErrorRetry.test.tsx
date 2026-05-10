import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorRetry from "./ErrorRetry";

describe("ErrorRetry", () => {
  it("renders alert role + message", () => {
    render(<ErrorRetry message="Network down" onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("invokes onRetry when retry button clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorRetry message="Boom" onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("compact variant still triggers onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorRetry message="Boom" onRetry={onRetry} compact />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
