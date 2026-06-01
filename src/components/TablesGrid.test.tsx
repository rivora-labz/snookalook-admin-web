import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

const apiFetchMock = vi.fn<(path: string) => Promise<unknown>>();
const realtimeSpy = vi.fn<(centerId: string | null, cb: () => void) => void>();

vi.mock("../lib/api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
}));

vi.mock("../hooks/useRealtimeTables", () => ({
  useRealtimeTables: (centerId: string | null, cb: () => void) => realtimeSpy(centerId, cb),
}));

import { TablesGrid } from "./TablesGrid";

const sampleTable = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "t1",
  tableNumber: 7,
  type: "SNOOKER",
  hourlyRate: 50,
  status: "AVAILABLE",
  currentSessionStartedAt: null,
  currentBooking: null,
  ...overrides,
});

describe("TablesGrid", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    realtimeSpy.mockReset();
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({ items: [] });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading skeleton initially", () => {
    apiFetchMock.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<TablesGrid />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when items=[]", async () => {
    render(<TablesGrid />);
    expect(await screen.findByText(/No tables found/)).toBeInTheDocument();
  });

  it("renders table card with number and type", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({ items: [sampleTable({ tableNumber: 7, type: "SNOOKER" })] });
    });
    render(<TablesGrid />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(screen.getByText("SNOOKER")).toBeInTheDocument();
  });

  it("AVAILABLE status renders Available label", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({ items: [sampleTable({ status: "AVAILABLE" })] });
    });
    render(<TablesGrid />);
    expect(await screen.findByText("Available")).toBeInTheDocument();
  });

  it("IN_PLAY status renders 'In Play' label", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({ items: [sampleTable({ status: "IN_PLAY" })] });
    });
    render(<TablesGrid />);
    expect(await screen.findByText("In Play")).toBeInTheDocument();
  });

  it("RESERVED + MAINTENANCE labels render", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({
        items: [
          sampleTable({ id: "a", tableNumber: 1, status: "RESERVED" }),
          sampleTable({ id: "b", tableNumber: 2, status: "MAINTENANCE" }),
        ],
      });
    });
    render(<TablesGrid />);
    expect(await screen.findByText("Reserved")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
  });

  it("currentBooking renders 'Playing: <host name>'", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({
        items: [
          sampleTable({
            currentBooking: {
              id: "b1",
              host: { id: "h1", displayName: "Eve", avatarUrl: null },
              startAt: "x",
              endAt: "y",
            },
          }),
        ],
      });
    });
    render(<TablesGrid />);
    expect(await screen.findByText("Playing:")).toBeInTheDocument();
    expect(screen.getByText("Eve")).toBeInTheDocument();
  });

  it("no currentBooking → no Playing block", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.resolve({ items: [sampleTable()] });
    });
    render(<TablesGrid />);
    await screen.findByText("Available");
    expect(screen.queryByText("Playing:")).not.toBeInTheDocument();
  });

  it("apiFetch error → renders error message + Retry button", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.reject(new Error("boom"));
    });
    render(<TablesGrid />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("Retry button re-invokes fetch", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/staff/me") return Promise.resolve({ staffMember: { centerId: "c1" } });
      return Promise.reject(new Error("net"));
    });
    render(<TablesGrid />);
    const retry = await screen.findByText("Retry");
    const callCountBefore = apiFetchMock.mock.calls.filter((c) => c[0] === "/admin/tables").length;
    fireEvent.click(retry);
    await waitFor(() => {
      const after = apiFetchMock.mock.calls.filter((c) => c[0] === "/admin/tables").length;
      expect(after).toBeGreaterThan(callCountBefore);
    });
  });

  it("useRealtimeTables receives centerId after /staff/me resolves", async () => {
    render(<TablesGrid />);
    await screen.findByText(/No tables found/);
    await waitFor(() => {
      const lastCall = realtimeSpy.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe("c1");
    });
  });
});
