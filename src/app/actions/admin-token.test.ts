import { describe, it, expect, vi, beforeEach } from "vitest";

const setMock = vi.fn();
const getMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: setMock,
    get: getMock,
  })),
}));

import {
  setAdminAccessTokenCookie,
  clearAdminAccessTokenCookie,
  getAdminAccessToken,
} from "./admin-token";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "../../lib/runtime-auth";

beforeEach(() => {
  setMock.mockReset();
  getMock.mockReset();
});

describe("admin-token server actions — WEB.6 HttpOnly enforcement", () => {
  it("setAdminAccessTokenCookie writes httpOnly:true cookie with sameSite lax + 1h maxAge + root path", async () => {
    await setAdminAccessTokenCookie("test.jwt.payload");

    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0]!;
    expect(name).toBe(ADMIN_ACCESS_TOKEN_COOKIE);
    expect(value).toBe("test.jwt.payload");
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });
  });

  it("clearAdminAccessTokenCookie writes httpOnly:true empty cookie with maxAge:0", async () => {
    await clearAdminAccessTokenCookie();

    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0]!;
    expect(name).toBe(ADMIN_ACCESS_TOKEN_COOKIE);
    expect(value).toBe("");
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  });

  it("getAdminAccessToken returns cookie value when present", async () => {
    getMock.mockReturnValue({ value: "stored.jwt" });

    const token = await getAdminAccessToken();
    expect(token).toBe("stored.jwt");
    expect(getMock).toHaveBeenCalledWith(ADMIN_ACCESS_TOKEN_COOKIE);
  });

  it("getAdminAccessToken returns null when cookie absent", async () => {
    getMock.mockReturnValue(undefined);

    const token = await getAdminAccessToken();
    expect(token).toBeNull();
  });
});
