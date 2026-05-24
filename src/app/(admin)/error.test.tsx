import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import AdminError from "./error";

describe("AdminError boundary (App Router)", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
  });

  it("invokes Sentry.captureException with boundary tag on mount", () => {
    const err = new Error("admin boom");
    render(<AdminError error={err} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { boundary: "admin-error" },
    });
  });

  it("renders error message and digest", () => {
    const err = Object.assign(new Error("specific oops"), { digest: "DIGEST123" });
    render(<AdminError error={err} reset={() => {}} />);
    expect(screen.getByText(/specific oops/)).toBeInTheDocument();
    expect(screen.getByText(/DIGEST123/)).toBeInTheDocument();
  });

  it("re-fires captureException when error prop changes", () => {
    const err1 = new Error("first");
    const { rerender } = render(<AdminError error={err1} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    const err2 = new Error("second");
    rerender(<AdminError error={err2} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(err2, {
      tags: { boundary: "admin-error" },
    });
  });
});
