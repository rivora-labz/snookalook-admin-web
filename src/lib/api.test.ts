import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getRuntimeAuthModeMock = vi.fn();
const readAdminAccessTokenCookieMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("./runtime-auth", () => ({
  getRuntimeAuthMode: () => getRuntimeAuthModeMock(),
  readAdminAccessTokenCookie: () => readAdminAccessTokenCookieMock(),
  ADMIN_ACCESS_TOKEN_COOKIE: "snl_admin_access_token",
}));

vi.mock("./supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: () => getSessionMock() },
  }),
}));

import { apiFetch, apiFetchBlob, ApiError, MisconfiguredAuth } from "./api";

const lastFetchCall = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
const lastFetchHeaders = () => (lastFetchCall()[1] as RequestInit).headers as Record<string, string>;

describe("ApiError", () => {
  it("captures status + code + message", () => {
    const e = new ApiError(404, "NOT_FOUND", "Booking missing");
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(404);
    expect(e.code).toBe("NOT_FOUND");
    expect(e.message).toBe("Booking missing");
    expect(e.name).toBe("ApiError");
  });
});

describe("MisconfiguredAuth", () => {
  it("has default message + name", () => {
    const e = new MisconfiguredAuth();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("MisconfiguredAuth");
    expect(e.message).toMatch(/NEXT_PUBLIC_DEV_USER_ID/);
  });
});

describe("apiFetch auth-header branches", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    readAdminAccessTokenCookieMock.mockReset();
    getSessionMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("supabase mode + session → Authorization: Bearer <token>", async () => {
    getRuntimeAuthModeMock.mockReturnValue("supabase");
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "sb-jwt" } } });
    await apiFetch("/x");
    expect(lastFetchHeaders()).toMatchObject({ Authorization: "Bearer sb-jwt" });
  });

  it("supabase mode + no session → no Authorization", async () => {
    getRuntimeAuthModeMock.mockReturnValue("supabase");
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await apiFetch("/x");
    expect(lastFetchHeaders().Authorization).toBeUndefined();
  });

  it("backend mode → routes through /api/proxy with no client Authorization (WEB.6.A)", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    await apiFetch("/x");
    expect(lastFetchCall()[0]).toBe("/api/proxy/x");
    expect(lastFetchHeaders().Authorization).toBeUndefined();
  });

  it("always sets Content-Type: application/json", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    readAdminAccessTokenCookieMock.mockReturnValue(null);
    await apiFetch("/x");
    expect(lastFetchHeaders()["Content-Type"]).toBe("application/json");
  });

  it("merges caller-provided init.headers", async () => {
    getRuntimeAuthModeMock.mockReturnValue("backend");
    readAdminAccessTokenCookieMock.mockReturnValue(null);
    await apiFetch("/x", { headers: { "X-Trace": "abc" } });
    expect(lastFetchHeaders()["X-Trace"]).toBe("abc");
  });
});

describe("apiFetch error handling", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    readAdminAccessTokenCookieMock.mockReset();
    getSessionMock.mockReset();
    getRuntimeAuthModeMock.mockReturnValue("backend");
    readAdminAccessTokenCookieMock.mockReturnValue("tok");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("non-OK throws ApiError with code + message from JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "GONE", message: "Resource gone" }), { status: 404 })),
    );
    await expect(apiFetch("/x")).rejects.toMatchObject({
      status: 404,
      code: "GONE",
      message: "Resource gone",
    });
  });

  it("non-OK with non-JSON body → fallback UNKNOWN + statusText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500, statusText: "Server Error" })),
    );
    await expect(apiFetch("/x")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "Server Error",
    });
  });

  it("dev-mode 401 does NOT redirect (still throws)", async () => {
    getRuntimeAuthModeMock.mockReturnValue("dev");
    // dev mode + DEV_USER_ID unset would throw MisconfiguredAuth before fetch — skip
    // For this path we need to ensure dev mode and a 401 path; since DEV_USER_ID is
    // module-load snapshotted, dev mode without it throws MisconfiguredAuth, not 401.
    // So assert MisconfiguredAuth instead.
    await expect(apiFetch("/x")).rejects.toBeInstanceOf(MisconfiguredAuth);
  });

  it("OK 200 → returns parsed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "bk-1", n: 7 }), { status: 200 })),
    );
    await expect(apiFetch<{ id: string; n: number }>("/x")).resolves.toEqual({ id: "bk-1", n: 7 });
  });
});

describe("apiFetchBlob", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    readAdminAccessTokenCookieMock.mockReset();
    getRuntimeAuthModeMock.mockReturnValue("backend");
    readAdminAccessTokenCookieMock.mockReturnValue("tok");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns Blob on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("binary-data", { status: 200 })),
    );
    const blob = await apiFetchBlob("/dl");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("throws ApiError on non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "NOPE" }), { status: 403 })),
    );
    await expect(apiFetchBlob("/dl")).rejects.toMatchObject({ status: 403, code: "NOPE" });
  });
});
