import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getRuntimeAuthModeMock = vi.fn();
const cookiesGetMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("./api-base", () => ({
  API_BASE: "https://api.example.com/v1",
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
    auth: { getSession: () => getSessionMock() },
  }),
}));

async function freshAuth() {
  vi.resetModules();
  return await import("./auth");
}

function fetchOk(body: unknown) {
  return vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(body), { status: 200 }));
}
function fetchStatus(status: number) {
  return vi.fn(async (..._args: unknown[]) => new Response("", { status }));
}

const STAFF_BODY = {
  staffMember: {
    id: "sm-1",
    centerId: "c-1",
    centerName: "Center One",
    role: "OWNER",
    user: { id: "u-1", displayName: "Alice", email: "a@x.com", phone: "+971500000001" },
  },
};

describe("getStaffContext", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    getSessionMock.mockReset();
    vi.unstubAllEnvs();
    // mode irrelevant for getStaffContext itself, but module-load reads it
    getRuntimeAuthModeMock.mockReturnValue("supabase");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns parsed staff context on 200 with staffMember body", async () => {
    vi.stubGlobal("fetch", fetchOk(STAFF_BODY));
    const { getStaffContext } = await freshAuth();
    const ctx = await getStaffContext("tok");
    expect(ctx).toEqual({
      staffMemberId: "sm-1",
      centerId: "c-1",
      centerName: "Center One",
      role: "OWNER",
      user: STAFF_BODY.staffMember.user,
    });
  });

  it("returns null on non-2xx response", async () => {
    vi.stubGlobal("fetch", fetchStatus(403));
    const { getStaffContext } = await freshAuth();
    expect(await getStaffContext("tok")).toBeNull();
  });

  it("returns null when body lacks staffMember", async () => {
    vi.stubGlobal("fetch", fetchOk({}));
    const { getStaffContext } = await freshAuth();
    expect(await getStaffContext("tok")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    const { getStaffContext } = await freshAuth();
    expect(await getStaffContext("tok")).toBeNull();
  });

  it("sends Authorization Bearer header by default (isDevUser=false)", async () => {
    const f = fetchOk(STAFF_BODY);
    vi.stubGlobal("fetch", f);
    const { getStaffContext } = await freshAuth();
    await getStaffContext("real-token");
    expect(f.mock.calls[0]![0]).toBe("https://api.example.com/v1/staff/me");
    expect((f.mock.calls[0]![1] as RequestInit).headers).toEqual({
      Authorization: "Bearer real-token",
    });
    expect((f.mock.calls[0]![1] as RequestInit).cache).toBe("no-store");
  });

  it("sends X-Dev-User header when isDevUser=true", async () => {
    const f = fetchOk(STAFF_BODY);
    vi.stubGlobal("fetch", f);
    const { getStaffContext } = await freshAuth();
    await getStaffContext("u-dev", true);
    expect((f.mock.calls[0]![1] as RequestInit).headers).toEqual({
      "X-Dev-User": "u-dev",
    });
  });

  it("maps missing centerId/centerName/email to null/undefined safely", async () => {
    vi.stubGlobal(
      "fetch",
      fetchOk({
        staffMember: {
          id: "sm-2",
          role: "STAFF",
          user: { id: "u-2", displayName: "Bob", email: null, phone: "+971500000002" },
        },
      }),
    );
    const { getStaffContext } = await freshAuth();
    const ctx = await getStaffContext("tok");
    expect(ctx).toMatchObject({
      staffMemberId: "sm-2",
      centerId: null,
      role: "STAFF",
    });
    expect(ctx?.centerName).toBeUndefined();
  });
});

describe("getServerSession — supabase mode", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    getSessionMock.mockReset();
    vi.unstubAllEnvs();
    getRuntimeAuthModeMock.mockReturnValue("supabase");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns null when no supabase session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal("fetch", fetchStatus(401));
    const { getServerSession } = await freshAuth();
    expect(await getServerSession()).toBeNull();
  });

  it("returns session + staff when session present and /staff/me ok", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "sb-jwt",
          user: { id: "u-sb", email: "x@y.com", phone: "+971500000003" },
        },
      },
    });
    vi.stubGlobal("fetch", fetchOk(STAFF_BODY));
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss).toMatchObject({
      userId: "u-sb",
      accessToken: "sb-jwt",
      email: "x@y.com",
      phone: "+971500000003",
    });
    expect(ss?.staff).toMatchObject({ staffMemberId: "sm-1", role: "OWNER" });
  });

  it("returns session with staff=null when /staff/me fails", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "sb-jwt", user: { id: "u-sb" } } },
    });
    vi.stubGlobal("fetch", fetchStatus(403));
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss?.staff).toBeNull();
    expect(ss?.email).toBeNull();
    expect(ss?.phone).toBeNull();
  });
});

describe("getServerSession — backend mode", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    vi.unstubAllEnvs();
    getRuntimeAuthModeMock.mockReturnValue("backend");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns null when no admin cookie", async () => {
    cookiesGetMock.mockReturnValue(undefined);
    const { getServerSession } = await freshAuth();
    expect(await getServerSession()).toBeNull();
  });

  it("returns null when cookie present but staff lookup fails", async () => {
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal("fetch", fetchStatus(403));
    const { getServerSession } = await freshAuth();
    expect(await getServerSession()).toBeNull();
  });

  it("returns session sourced from staff context when cookie + staff ok", async () => {
    cookiesGetMock.mockReturnValue({ value: "tok" });
    vi.stubGlobal("fetch", fetchOk(STAFF_BODY));
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss).toMatchObject({
      userId: "u-1",
      accessToken: "tok",
      email: "a@x.com",
      phone: "+971500000001",
    });
    expect(ss?.staff?.role).toBe("OWNER");
  });
});

describe("getServerSession — dev mode", () => {
  beforeEach(() => {
    getRuntimeAuthModeMock.mockReset();
    cookiesGetMock.mockReset();
    vi.unstubAllEnvs();
    getRuntimeAuthModeMock.mockReturnValue("dev");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns hard-coded DEV fallback session when NEXT_PUBLIC_DEV_USER_ID unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_USER_ID", "");
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss).toMatchObject({
      userId: "dev-user",
      accessToken: "",
      email: null,
      phone: null,
    });
    expect(ss?.staff?.staffMemberId).toBe("dev-staff");
    expect(ss?.staff?.role).toBe("OWNER");
  });

  it("returns staff from backend when DEV_USER_ID set + backend ok (X-Dev-User header)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_USER_ID", "u-dev-1");
    const f = fetchOk(STAFF_BODY);
    vi.stubGlobal("fetch", f);
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss?.userId).toBe("u-dev-1");
    expect(ss?.staff?.staffMemberId).toBe("sm-1");
    expect((f.mock.calls[0]![1] as RequestInit).headers).toEqual({
      "X-Dev-User": "u-dev-1",
    });
  });

  it("falls back to DEV_STAFF when DEV_USER_ID set but backend fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_USER_ID", "u-dev-1");
    vi.stubGlobal("fetch", fetchStatus(500));
    const { getServerSession } = await freshAuth();
    const ss = await getServerSession();
    expect(ss?.userId).toBe("u-dev-1");
    expect(ss?.staff?.staffMemberId).toBe("dev-staff");
  });
});
