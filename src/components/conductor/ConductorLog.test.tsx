import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ConductorLog from "./ConductorLog";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConductorLog", () => {
  it("renders pause button initially", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: [] }),
    });
    render(<ConductorLog />);
    expect(screen.getByText("pause")).toBeTruthy();
  });

  it("renders 'No log lines.' when fetch returns empty array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: [] }),
    });
    render(<ConductorLog />);
    await waitFor(() => expect(screen.getByText("No log lines.")).toBeTruthy());
  });

  it("renders fetched log lines", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: ["line alpha", "line beta"] }),
    });
    render(<ConductorLog />);
    await waitFor(() => expect(screen.getByText("line alpha")).toBeTruthy());
    expect(screen.getByText("line beta")).toBeTruthy();
  });

  it("shows line count in status text", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: ["a", "b", "c"] }),
    });
    render(<ConductorLog />);
    await waitFor(() => expect(screen.getByText("3 lines")).toBeTruthy());
  });

  it("shows error when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    render(<ConductorLog />);
    await waitFor(() =>
      expect(screen.getByText(/status 500/).textContent).toBeTruthy(),
    );
  });

  it("pause button toggles to resume on click", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: [] }),
    });
    render(<ConductorLog />);
    fireEvent.click(screen.getByText("pause"));
    expect(screen.getByText("resume")).toBeTruthy();
  });

  it("resume button toggles back to pause on click", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lines: [] }),
    });
    render(<ConductorLog />);
    fireEvent.click(screen.getByText("pause"));
    fireEvent.click(screen.getByText("resume"));
    expect(screen.getByText("pause")).toBeTruthy();
  });
});
