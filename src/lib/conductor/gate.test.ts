import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";

const headersGetMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersGetMock(name),
  }),
}));

import { isDevLocalhost, projectRoot, validateAgentName } from "./gate";

describe("isDevLocalhost", () => {
  beforeEach(() => {
    headersGetMock.mockReset();
    vi.unstubAllEnvs();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns false in production regardless of headers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    headersGetMock.mockImplementation((n: string) =>
      n === "host" ? "localhost:3000" : "127.0.0.1",
    );
    expect(await isDevLocalhost()).toBe(false);
  });

  it("returns true when no x-forwarded-for and no host header", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockReturnValue(null);
    expect(await isDevLocalhost()).toBe(true);
  });

  it("returns true for localhost host + 127.0.0.1 xff", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "host" ? "localhost:3000" : n === "x-forwarded-for" ? "127.0.0.1" : null,
    );
    expect(await isDevLocalhost()).toBe(true);
  });

  it("returns true for ::1 xff", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "::1" : n === "host" ? "[::1]:3000" : null,
    );
    expect(await isDevLocalhost()).toBe(true);
  });

  it("returns false for non-loopback xff", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "192.168.1.50" : null,
    );
    expect(await isDevLocalhost()).toBe(false);
  });

  it("returns false for non-local host header", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "host" ? "example.com" : null,
    );
    expect(await isDevLocalhost()).toBe(false);
  });

  it("uses first xff entry when comma-separated chain present", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "127.0.0.1, 10.0.0.1" : null,
    );
    expect(await isDevLocalhost()).toBe(true);
  });

  it("trims whitespace from first xff entry", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "  127.0.0.1  , 10.0.0.1" : null,
    );
    expect(await isDevLocalhost()).toBe(true);
  });

  it("accepts ::ffff:127.0.0.1 (v4-in-v6 form)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersGetMock.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "::ffff:127.0.0.1" : null,
    );
    expect(await isDevLocalhost()).toBe(true);
  });
});

describe("projectRoot", () => {
  it("returns path two levels above cwd", () => {
    expect(projectRoot()).toBe(path.resolve(process.cwd(), "..", ".."));
  });
});

describe("validateAgentName", () => {
  it("accepts lowercase letters only", () => {
    expect(validateAgentName("admin")).toBe(true);
  });

  it("accepts lowercase + digits + hyphens", () => {
    expect(validateAgentName("admin-web-2")).toBe(true);
  });

  it("accepts single char", () => {
    expect(validateAgentName("a")).toBe(true);
  });

  it("accepts exactly 31 chars (1 + 30)", () => {
    expect(validateAgentName("a" + "b".repeat(30))).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(validateAgentName(42)).toBe(false);
    expect(validateAgentName(null)).toBe(false);
    expect(validateAgentName(undefined)).toBe(false);
    expect(validateAgentName({ name: "x" })).toBe(false);
  });

  it("rejects string starting with digit", () => {
    expect(validateAgentName("1abc")).toBe(false);
  });

  it("rejects string starting with hyphen", () => {
    expect(validateAgentName("-abc")).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(validateAgentName("Admin")).toBe(false);
  });

  it("rejects underscores", () => {
    expect(validateAgentName("a_b")).toBe(false);
  });

  it("rejects dots and slashes (path-traversal defense)", () => {
    expect(validateAgentName("a.b")).toBe(false);
    expect(validateAgentName("../etc")).toBe(false);
    expect(validateAgentName("a/b")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateAgentName("")).toBe(false);
  });

  it("rejects > 31 chars", () => {
    expect(validateAgentName("a" + "b".repeat(31))).toBe(false);
  });
});
