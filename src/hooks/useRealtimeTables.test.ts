import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type AnyFn = (...args: unknown[]) => unknown;

const connectSocketMock = vi.fn();

vi.mock("../lib/realtime", () => ({
  connectSocket: () => connectSocketMock(),
}));

import { useRealtimeTables } from "./useRealtimeTables";

interface FakeSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  _handler?: AnyFn;
}

function makeSocket(): FakeSocket {
  const s: FakeSocket = {
    emit: vi.fn(),
    on: vi.fn((_evt: string, h: AnyFn) => {
      s._handler = h;
    }),
    off: vi.fn(),
  };
  return s;
}

describe("useRealtimeTables", () => {
  beforeEach(() => {
    connectSocketMock.mockReset();
  });

  it("does not connect when centerId is null", async () => {
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables(null, onInvalidate));
    await new Promise((r) => setTimeout(r, 0));
    expect(connectSocketMock).not.toHaveBeenCalled();
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it("calls connectSocket when centerId is provided", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables("c-1", onInvalidate));
    await waitFor(() => expect(connectSocketMock).toHaveBeenCalledTimes(1));
  });

  it("joins admin room and registers handler after connect", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables("c-2", onInvalidate));
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith("join:admin", "c-2"));
    expect(socket.on).toHaveBeenCalledWith("table.updated", expect.any(Function));
  });

  it("invokes onInvalidate when table.updated event matches centerId", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables("c-3", onInvalidate));
    await waitFor(() => expect(socket._handler).toBeTypeOf("function"));
    socket._handler!({
      type: "table.updated",
      centerId: "c-3",
      table: { id: "t1", centerId: "c-3", status: "available" },
    });
    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke onInvalidate when event.centerId mismatches", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables("c-4", onInvalidate));
    await waitFor(() => expect(socket._handler).toBeTypeOf("function"));
    socket._handler!({
      type: "table.updated",
      centerId: "other-center",
      table: { id: "t1", centerId: "other-center", status: "available" },
    });
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it("cleanup unregisters handler and emits leave:center on unmount", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    const { unmount } = renderHook(() => useRealtimeTables("c-5", onInvalidate));
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith("join:admin", "c-5"));
    unmount();
    expect(socket.off).toHaveBeenCalledWith("table.updated", expect.any(Function));
    expect(socket.emit).toHaveBeenCalledWith("leave:center", "c-5");
  });

  it("handles null socket gracefully when connectSocket returns null", async () => {
    connectSocketMock.mockResolvedValue(null);
    const onInvalidate = vi.fn();
    const { unmount } = renderHook(() => useRealtimeTables("c-6", onInvalidate));
    await waitFor(() => expect(connectSocketMock).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it("cleanup before async connect resolves prevents registration", async () => {
    const socket = makeSocket();
    let resolve!: (s: FakeSocket) => void;
    connectSocketMock.mockReturnValue(new Promise<FakeSocket>((res) => { resolve = res; }));
    const onInvalidate = vi.fn();
    const { unmount } = renderHook(() => useRealtimeTables("c-7", onInvalidate));
    unmount();
    resolve(socket);
    await new Promise((r) => setTimeout(r, 0));
    expect(socket.emit).not.toHaveBeenCalled();
    expect(socket.on).not.toHaveBeenCalled();
  });

  it("re-subscribes when centerId changes (cleanup old, register new)", async () => {
    const socketA = makeSocket();
    const socketB = makeSocket();
    connectSocketMock.mockResolvedValueOnce(socketA).mockResolvedValueOnce(socketB);
    const onInvalidate = vi.fn();
    const { rerender } = renderHook(({ id }: { id: string }) => useRealtimeTables(id, onInvalidate), {
      initialProps: { id: "c-A" },
    });
    await waitFor(() => expect(socketA.emit).toHaveBeenCalledWith("join:admin", "c-A"));
    rerender({ id: "c-B" });
    await waitFor(() => expect(socketB.emit).toHaveBeenCalledWith("join:admin", "c-B"));
    expect(socketA.off).toHaveBeenCalledWith("table.updated", expect.any(Function));
    expect(socketA.emit).toHaveBeenCalledWith("leave:center", "c-A");
  });

  it("re-subscribes when onInvalidate identity changes", async () => {
    const socketA = makeSocket();
    const socketB = makeSocket();
    connectSocketMock.mockResolvedValueOnce(socketA).mockResolvedValueOnce(socketB);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => useRealtimeTables("c-8", cb), {
      initialProps: { cb: cb1 },
    });
    await waitFor(() => expect(socketA.emit).toHaveBeenCalledWith("join:admin", "c-8"));
    rerender({ cb: cb2 });
    await waitFor(() => expect(socketB.emit).toHaveBeenCalledWith("join:admin", "c-8"));
    expect(socketA.off).toHaveBeenCalled();
  });

  it("ignores event if it lacks matching centerId field shape (defensive)", async () => {
    const socket = makeSocket();
    connectSocketMock.mockResolvedValue(socket);
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeTables("c-9", onInvalidate));
    await waitFor(() => expect(socket._handler).toBeTypeOf("function"));
    socket._handler!({
      type: "table.updated",
      centerId: undefined as unknown as string,
      table: { id: "t1", centerId: "x", status: "available" },
    });
    expect(onInvalidate).not.toHaveBeenCalled();
  });
});
