import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import GlobalError from "./global-error";

// GlobalError renders <html><body>, which RTL appends inside jsdom's body.
// React 18 logs a hydration/nesting warning — silenced for these tests.
let consoleErrSpy: ReturnType<typeof vi.spyOn>;

describe("GlobalError boundary (App Router top-level)", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
    consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrSpy.mockRestore();
  });

  it("invokes Sentry.captureException with boundary tag on mount", () => {
    const err = new Error("global boom");
    render(<GlobalError error={err} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { boundary: "global-error" },
    });
  });

  it("re-fires captureException when error prop changes", () => {
    const err1 = new Error("first");
    const { rerender } = render(<GlobalError error={err1} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    const err2 = new Error("second");
    rerender(<GlobalError error={err2} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(err2, {
      tags: { boundary: "global-error" },
    });
  });
});
