import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  getRuntimeAuthMode,
  getSupabaseConfig,
  readAdminAccessTokenCookie,
  writeAdminAccessTokenCookie,
  clearAdminAccessTokenCookie,
} from "./runtime-auth";

const setSupabaseEnv = () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.example.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-abc");
};
const clearSupabaseEnv = () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
};

function clearCookies() {
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

describe("ADMIN_ACCESS_TOKEN_COOKIE", () => {
  it("is the canonical cookie name", () => {
    expect(ADMIN_ACCESS_TOKEN_COOKIE).toBe("snl_admin_access_token");
  });
});

describe("getRuntimeAuthMode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 'dev' when configured=dev and NODE_ENV != production", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "dev");
    vi.stubEnv("NODE_ENV", "development");
    expect(getRuntimeAuthMode()).toBe("dev");
  });

  it("rejects dev in production, falls back to supabase when configured", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "dev");
    vi.stubEnv("NODE_ENV", "production");
    expect(getRuntimeAuthMode()).toBe("supabase");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("rejects dev in production, falls back to backend when supabase missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "dev");
    vi.stubEnv("NODE_ENV", "production");
    expect(getRuntimeAuthMode()).toBe("backend");
  });

  it("returns 'backend' when configured=backend (regardless of supabase config)", () => {
    setSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    expect(getRuntimeAuthMode()).toBe("backend");
  });

  it("returns 'supabase' when configured=supabase and supabase config present", () => {
    setSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    expect(getRuntimeAuthMode()).toBe("supabase");
  });

  it("returns 'backend' when configured=supabase but supabase config missing", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "supabase");
    expect(getRuntimeAuthMode()).toBe("backend");
  });

  it("returns 'supabase' by default when AUTH_MODE unset + supabase config present", () => {
    setSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "");
    expect(getRuntimeAuthMode()).toBe("supabase");
  });

  it("returns 'backend' by default when AUTH_MODE unset + supabase config missing", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "");
    expect(getRuntimeAuthMode()).toBe("backend");
  });
});

describe("getSupabaseConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns url+anonKey when both set", () => {
    setSupabaseEnv();
    expect(getSupabaseConfig()).toEqual({
      url: "https://sb.example.co",
      anonKey: "anon-abc",
    });
  });

  it("throws when url missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "k");
    expect(() => getSupabaseConfig()).toThrow(/Supabase public auth config is missing/);
  });

  it("throws when anonKey missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.io");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabaseConfig()).toThrow();
  });
});

describe("cookie helpers", () => {
  beforeEach(() => {
    clearCookies();
  });
  afterEach(() => {
    clearCookies();
  });

  it("readAdminAccessTokenCookie returns null when cookie missing", () => {
    expect(readAdminAccessTokenCookie()).toBeNull();
  });

  it("writeAdminAccessTokenCookie + readAdminAccessTokenCookie round-trip", () => {
    writeAdminAccessTokenCookie("tok-123");
    expect(readAdminAccessTokenCookie()).toBe("tok-123");
  });

  it("URL-encodes special chars and decodes on read", () => {
    writeAdminAccessTokenCookie("a b=c/d&e");
    expect(readAdminAccessTokenCookie()).toBe("a b=c/d&e");
  });

  it("clearAdminAccessTokenCookie removes the cookie", () => {
    writeAdminAccessTokenCookie("tok-2");
    clearAdminAccessTokenCookie();
    expect(readAdminAccessTokenCookie()).toBeNull();
  });

  it("readAdminAccessTokenCookie ignores other cookies", () => {
    document.cookie = "other=value; Path=/";
    expect(readAdminAccessTokenCookie()).toBeNull();
    writeAdminAccessTokenCookie("tok-3");
    expect(readAdminAccessTokenCookie()).toBe("tok-3");
  });
});
