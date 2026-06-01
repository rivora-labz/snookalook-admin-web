import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ioMock = vi.fn();
const getSessionMock = vi.fn();
const sentryAddBreadcrumbMock = vi.fn();

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => sentryAddBreadcrumbMock(...args),
}));

vi.mock("./supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: () => getSessionMock() },
  }),
}));

async function freshModule() {
  vi.resetModules();
  return await import("./realtime");
}

function makeFakeSocket() {
  const handlers: Record<string, ((arg?: unknown) => void)[]> = {};
  const s = {
    connected: false,
    id: "sock-abc",
    on: vi.fn((evt: string, fn: () => void) => {
      (handlers[evt] ||= []).push(fn);
    }),
    connect: vi.fn(() => {
      s.connected = true;
    }),
    disconnect: vi.fn(() => {
      s.connected = false;
    }),
    handlers,
  };
  return s;
}

describe("connectSocket guards", () => {
  beforeEach(() => {
    ioMock.mockReset();
    getSessionMock.mockReset();
    sentryAddBreadcrumbMock.mockReset();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when WS_URL is unset (regardless of auth mode)", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    const { connectSocket } = await freshModule();
    expect(await connectSocket()).toBeNull();
    expect(ioMock).not.toHaveBeenCalled();
  });

  it("returns null when AUTH_MODE !== 'supabase' (dev mode)", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "dev");
    const { connectSocket } = await freshModule();
    expect(await connectSocket()).toBeNull();
    expect(ioMock).not.toHaveBeenCalled();
  });

  it("returns null when AUTH_MODE=backend (no JWT for WS plane)", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    const { connectSocket } = await freshModule();
    expect(await connectSocket()).toBeNull();
  });

  it("returns null when supabase session has no access_token", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { connectSocket } = await freshModule();
    expect(await connectSocket()).toBeNull();
    expect(ioMock).not.toHaveBeenCalled();
  });

  it("creates socket with Bearer token + path=/ws when session present", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const fake = makeFakeSocket();
    ioMock.mockReturnValue(fake);

    const { connectSocket } = await freshModule();
    const sock = await connectSocket();

    expect(sock).toBe(fake);
    expect(ioMock).toHaveBeenCalledTimes(1);
    const [url, opts] = ioMock.mock.calls[0]!;
    expect(url).toBe("wss://ws.example.com");
    expect(opts).toMatchObject({
      path: "/ws",
      transports: ["websocket"],
      autoConnect: false,
      auth: { token: "Bearer sb-jwt" },
      reconnection: true,
    });
    expect(fake.connect).toHaveBeenCalledTimes(1);
  });

  it("registers connect / disconnect / connect_error handlers", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const fake = makeFakeSocket();
    ioMock.mockReturnValue(fake);

    const { connectSocket } = await freshModule();
    await connectSocket();

    const events = fake.on.mock.calls.map((c) => c[0]);
    expect(events).toContain("connect");
    expect(events).toContain("disconnect");
    expect(events).toContain("connect_error");
  });

  it("reuses inflight promise on concurrent calls (single io() invocation)", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const fake = makeFakeSocket();
    ioMock.mockReturnValue(fake);

    const { connectSocket } = await freshModule();
    const [a, b] = await Promise.all([connectSocket(), connectSocket()]);
    expect(a).toBe(b);
    expect(ioMock).toHaveBeenCalledTimes(1);
  });
});

describe("disconnectSocket + getSocket", () => {
  beforeEach(() => {
    ioMock.mockReset();
    getSessionMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("getSocket returns null before connect", async () => {
    const { getSocket } = await freshModule();
    expect(getSocket()).toBeNull();
  });

  it("disconnectSocket calls socket.disconnect and clears singleton", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://ws.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const fake = makeFakeSocket();
    ioMock.mockReturnValue(fake);

    const { connectSocket, disconnectSocket, getSocket } = await freshModule();
    await connectSocket();
    expect(getSocket()).toBe(fake);
    disconnectSocket();
    expect(fake.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBeNull();
  });

  it("disconnectSocket is safe to call when no socket exists", async () => {
    const { disconnectSocket } = await freshModule();
    expect(() => disconnectSocket()).not.toThrow();
  });
});
