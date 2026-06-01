import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const PROD = "https://api.snookalook.com/v1";

async function loadApiBase(): Promise<string> {
  vi.resetModules();
  const mod = await import("./api-base");
  return mod.API_BASE;
}

describe("API_BASE", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to production when NEXT_PUBLIC_API_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("returns configured value in non-production (development override)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    vi.stubEnv("NODE_ENV", "development");
    expect(await loadApiBase()).toBe("http://localhost:4000");
  });

  it("returns configured value in test env", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://mock-server.local/v1");
    vi.stubEnv("NODE_ENV", "test");
    expect(await loadApiBase()).toBe("http://mock-server.local/v1");
  });

  it("ignores override and forces production when NODE_ENV=production and origin differs", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://evil.example.com/v1");
    vi.stubEnv("NODE_ENV", "production");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("forces production when NODE_ENV=production and pathname is not /v1", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.snookalook.com/v2");
    vi.stubEnv("NODE_ENV", "production");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("forces production when NODE_ENV=production and configured URL is malformed", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "not a url");
    vi.stubEnv("NODE_ENV", "production");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("returns PROD when NODE_ENV=production and configured matches canonical /v1", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.snookalook.com/v1");
    vi.stubEnv("NODE_ENV", "production");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("accepts trailing-slash /v1/ in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.snookalook.com/v1/");
    vi.stubEnv("NODE_ENV", "production");
    expect(await loadApiBase()).toBe(PROD);
  });

  it("trims whitespace before evaluating configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "   ");
    vi.stubEnv("NODE_ENV", "development");
    expect(await loadApiBase()).toBe(PROD);
  });
});
