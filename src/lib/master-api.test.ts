import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getRuntimeAuthModeMock = vi.fn();
const cookiesGetMock = vi.fn();
const getUserMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("./api-base", () => ({
  API_BASE: "https://api.example.com/v1",
  SERVER_API_BASE: "https://server-api.example.com/v1",
}));

vi.mock("./runtime-auth", () => ({
  getRuntimeAuthMode: () => getRuntimeAuthModeMock(),
  ADMIN_ACCESS_TOKEN_COOKIE: "snl_admin_access_token",
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookiesGetMock(name),
  }),
}));

vi.mock("./supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: () => getUserMock(),
      getSession: () => getSessionMock(),
    },
  }),
}));

async function freshModule() {
  vi.resetModules();
  return await import("./master-api");
}

describe("masterFetch — auth header resolution", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    getUserMock.mockReset();
    getSessionMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("supabase mode: sends Bearer token from session", async () => {
    getRuntimeAuthModeMock.mockReturnValue("supabase");
    getUserMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://server-api.example.com/v1/admin/system/centers");
    expect((call[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sb-jwt",
    });
    expect((call[1] as RequestInit).cache).toBe("no-store");
  });

  it("supabase mode: no session → no Authorization header", async () => {
    getRuntimeAuthModeMock.mockReturnValue("supabase");
    getUserMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("supabase mode: getUser failure is swallowed (still proceeds to getSession)", async () => {
    getRuntimeAuthModeMock.mockReturnValue("supabase");
    getUserMock.mockRejectedValue(new Error("network"));
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    const { masterFetch } = await freshModule();
    await expect(masterFetch("/centers")).resolves.toBeTruthy();
  });

  it("backend mode: sends Bearer from cookie", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "cookie-tok" });
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).toMatchObject({ Authorization: "Bearer cookie-tok" });
  });

  it("backend mode: missing cookie → no Authorization", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue(undefined);
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("dev mode: sends X-Dev-User header when NEXT_PUBLIC_DEV_USER_ID set", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_USER_ID", "u-dev-1");
    getRuntimeAuthModeMock.mockReturnValue("dev");
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).toMatchObject({ "X-Dev-User": "u-dev-1" });
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("dev mode: missing NEXT_PUBLIC_DEV_USER_ID → no X-Dev-User header", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_USER_ID", "");
    getRuntimeAuthModeMock.mockReturnValue("dev");
    const { masterFetch } = await freshModule();
    await masterFetch("/centers");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).not.toHaveProperty("X-Dev-User");
  });

  it("merges init.headers with auth headers (auth wins on conflict)", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "cookie-tok" });
    const { masterFetch } = await freshModule();
    await masterFetch("/centers", {
      headers: { "X-Custom": "y", Authorization: "should-be-overridden" },
    });
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].headers;
    expect(headers).toMatchObject({
      "X-Custom": "y",
      Authorization: "Bearer cookie-tok",
    });
  });
});

describe("masterFetch — error/response handling", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    getUserMock.mockReset();
    getSessionMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("returns parsed JSON on success", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ items: [1, 2] }), { status: 200 })),
    );
    const { masterFetch } = await freshModule();
    const out = await masterFetch<{ items: number[] }>("/x");
    expect(out).toEqual({ items: [1, 2] });
  });

  it("throws Error with status + body + diag on non-2xx", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 503 })),
    );
    const { masterFetch } = await freshModule();
    await expect(masterFetch("/down")).rejects.toThrow(/503/);
    await expect(masterFetch("/down")).rejects.toThrow(/oops/);
    await expect(masterFetch("/down")).rejects.toThrow(/mode=backend/);
  });
});

describe("masterFetchSafe", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("returns data on success", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 })),
    );
    const { masterFetchSafe } = await freshModule();
    expect(await masterFetchSafe("/x", { a: 0 })).toEqual({ a: 1 });
  });

  it("returns fallback + logs on failure", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const { masterFetchSafe } = await freshModule();
    const out = await masterFetchSafe("/x", { a: -1 });
    expect(out).toEqual({ a: -1 });
    expect(errSpy).toHaveBeenCalledWith("[master-api]", "/x", expect.stringMatching(/500/));
    errSpy.mockRestore();
  });
});

describe("masterFetchOrError", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("returns { data, error: null } on success", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ v: 42 }), { status: 200 })),
    );
    const { masterFetchOrError } = await freshModule();
    const out = await masterFetchOrError("/x", { v: 0 });
    expect(out).toEqual({ data: { v: 42 }, error: null });
  });

  it("returns { data: fallback, error: msg } on failure", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getRuntimeAuthModeMock.mockReturnValue("backend");
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad", { status: 502 })),
    );
    const { masterFetchOrError } = await freshModule();
    const out = await masterFetchOrError("/x", { v: -1 });
    expect(out.data).toEqual({ v: -1 });
    expect(out.error).toMatch(/502/);
    expect(out.error).toMatch(/bad/);
    errSpy.mockRestore();
  });
});
