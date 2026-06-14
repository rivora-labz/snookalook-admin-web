import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const setMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: setMock,
  })),
}));

import { loginWithOtp, clearAdminAccessTokenCookie } from "./admin-token";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "../../lib/runtime-auth";

function mockVerifyOtp(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: vi.fn().mockReturnValue(null) },
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  setMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("admin-token server actions — WEB.6.A HttpOnly + no-leak", () => {
  it("loginWithOtp success writes cookie with strict flags (dev: secure=false)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockVerifyOtp({ accessToken: "jwt.from.backend" });

    const result = await loginWithOtp("+971501234567", "1234");

    expect(result).toEqual({ ok: true });
    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0]!;
    expect(name).toBe(ADMIN_ACCESS_TOKEN_COOKIE);
    expect(value).toBe("jwt.from.backend");
    expect(opts).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    });
  });

  it("loginWithOtp success in production sets secure=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockVerifyOtp({ accessToken: "prod.jwt" });

    const result = await loginWithOtp("+971501234567", "1234");

    expect(result).toEqual({ ok: true });
    const [, , opts] = setMock.mock.calls[0]!;
    expect(opts).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    });
  });

  it("loginWithOtp rejects malformed phone without backend call", async () => {
    const fetchMock = mockVerifyOtp({ accessToken: "should.not.fire" });

    const result = await loginWithOtp("not-a-phone", "1234");

    expect(result).toEqual({ ok: false, message: "Invalid phone." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("loginWithOtp rejects malformed otp without backend call", async () => {
    const fetchMock = mockVerifyOtp({ accessToken: "should.not.fire" });

    const result = await loginWithOtp("+971501234567", "abc");

    expect(result).toEqual({ ok: false, message: "Invalid code." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("loginWithOtp returns backend error message without setting cookie", async () => {
    mockVerifyOtp({ message: "Code expired." }, 401);

    const result = await loginWithOtp("+971501234567", "1234");

    expect(result).toEqual({ ok: false, message: "Code expired." });
    expect(setMock).not.toHaveBeenCalled();
  });

  it("loginWithOtp rejects backend success missing accessToken", async () => {
    mockVerifyOtp({}, 200);

    const result = await loginWithOtp("+971501234567", "1234");

    expect(result).toEqual({ ok: false, message: "Backend rejected (200)." });
    expect(setMock).not.toHaveBeenCalled();
  });

  it("loginWithOtp returns generic message on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));

    const result = await loginWithOtp("+971501234567", "1234");

    expect(result).toEqual({ ok: false, message: "Network error. Try again." });
    expect(setMock).not.toHaveBeenCalled();
  });

  it("clearAdminAccessTokenCookie writes empty value with maxAge:0 and strict flags (dev)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await clearAdminAccessTokenCookie();

    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0]!;
    expect(name).toBe(ADMIN_ACCESS_TOKEN_COOKIE);
    expect(value).toBe("");
    expect(opts).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
  });

  it("clearAdminAccessTokenCookie in production sets secure=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await clearAdminAccessTokenCookie();

    const [, , opts] = setMock.mock.calls[0]!;
    expect(opts).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
  });
});
