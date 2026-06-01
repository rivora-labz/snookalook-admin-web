import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const apiFetchMock = vi.fn();

vi.mock("./api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
}));

async function freshHook() {
  vi.resetModules();
  const mod = await import("./use-staff-session");
  return mod.useStaffSession;
}

const sampleMeResponse = () => ({
  staffMember: {
    role: "OWNER",
    centerId: "ctr-1",
    centerName: "Snooker Loft",
    user: { id: "usr-7", displayName: "Alice" },
  },
});

describe("useStaffSession", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("initial render: loading=true, session=null", async () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));
    const useStaffSession = await freshHook();
    const { result } = renderHook(() => useStaffSession());
    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it("apiFetch resolves → loading=false, session populated", async () => {
    apiFetchMock.mockResolvedValue(sampleMeResponse());
    const useStaffSession = await freshHook();
    const { result } = renderHook(() => useStaffSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual({
      role: "OWNER",
      userId: "usr-7",
      userDisplayName: "Alice",
      centerId: "ctr-1",
      centerName: "Snooker Loft",
    });
  });

  it("apiFetch rejects → loading=false, session stays null", async () => {
    apiFetchMock.mockRejectedValue(new Error("network down"));
    const useStaffSession = await freshHook();
    const { result } = renderHook(() => useStaffSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it("calls /staff/me", async () => {
    apiFetchMock.mockResolvedValue(sampleMeResponse());
    const useStaffSession = await freshHook();
    renderHook(() => useStaffSession());
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/staff/me"));
  });

  it("second hook reuses cached session (no extra apiFetch)", async () => {
    apiFetchMock.mockResolvedValue(sampleMeResponse());
    const useStaffSession = await freshHook();

    const { result: first } = renderHook(() => useStaffSession());
    await waitFor(() => expect(first.current.session).not.toBeNull());

    const callsAfterFirst = apiFetchMock.mock.calls.length;

    const { result: second } = renderHook(() => useStaffSession());
    expect(second.current.session).not.toBeNull();
    expect(second.current.loading).toBe(false);
    expect(apiFetchMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
