import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import MasterError from "./error";

describe("MasterError boundary (App Router /master)", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
    try { sessionStorage.clear(); } catch {}
    reloadSpy = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("captures generic error to Sentry with master-error tag", () => {
    const err = new Error("master boom");
    render(<MasterError error={err} reset={() => {}} />);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { boundary: "master-error" },
    });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("renders error message and digest for generic error", () => {
    const err = Object.assign(new Error("specific oops"), { digest: "DIGEST123" });
    render(<MasterError error={err} reset={() => {}} />);
    expect(screen.getByText(/specific oops/)).toBeInTheDocument();
    expect(screen.getByText(/DIGEST123/)).toBeInTheDocument();
  });

  it("auto-reloads once on UnrecognizedActionError and skips Sentry", () => {
    const err = Object.assign(
      new Error("Server Action hash 0018564f7a6d6da4924b00d52233e7917a5c6e880f not found"),
      { digest: "d1" }
    );
    render(<MasterError error={err} reset={() => {}} />);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("__sa_reload_d1")).toBe("1");
  });

  it("sessionStorage guard prevents 2nd reload for same digest", () => {
    sessionStorage.setItem("__sa_reload_d2", "1");
    const err = Object.assign(new Error("Server Action xyz not found"), { digest: "d2" });
    render(<MasterError error={err} reset={() => {}} />);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("shows stale-action messaging when guard is active", () => {
    sessionStorage.setItem("__sa_reload_d3", "1");
    const err = Object.assign(new Error("Server Action abc not found"), { digest: "d3" });
    render(<MasterError error={err} reset={() => {}} />);
    expect(screen.getByText(/page outdated/i)).toBeInTheDocument();
    expect(screen.getByText(/newer version was deployed/i)).toBeInTheDocument();
  });

  it("uses nodigest fallback key when digest missing", () => {
    const err = new Error("Server Action foo not found");
    render(<MasterError error={err} reset={() => {}} />);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("__sa_reload_nodigest")).toBe("1");
  });

  it("does NOT trigger reload for unrelated error containing 'not found'", () => {
    const err = new Error("Resource not found");
    render(<MasterError error={err} reset={() => {}} />);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
