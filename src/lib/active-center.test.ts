import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ACTIVE_CENTER_KEY,
  ACTIVE_CENTER_PARAM,
  persistActiveCenterId,
} from "./active-center";

describe("active-center constants", () => {
  it("ACTIVE_CENTER_KEY is namespaced sessionStorage key", () => {
    expect(ACTIVE_CENTER_KEY).toBe("adminweb.activeCenterId");
  });

  it("ACTIVE_CENTER_PARAM is centerId query param", () => {
    expect(ACTIVE_CENTER_PARAM).toBe("centerId");
  });
});

describe("persistActiveCenterId", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("writes centerId under ACTIVE_CENTER_KEY", () => {
    persistActiveCenterId("ctr-abc");
    expect(sessionStorage.getItem(ACTIVE_CENTER_KEY)).toBe("ctr-abc");
  });

  it("overwrites previous value", () => {
    persistActiveCenterId("ctr-1");
    persistActiveCenterId("ctr-2");
    expect(sessionStorage.getItem(ACTIVE_CENTER_KEY)).toBe("ctr-2");
  });

  it("silently swallows sessionStorage throw (private mode / quota)", () => {
    const original = window.sessionStorage;
    const throwing = {
      setItem: vi.fn(() => {
        throw new DOMException("QuotaExceededError");
      }),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, "sessionStorage", { value: throwing, configurable: true });
    expect(() => persistActiveCenterId("ctr-x")).not.toThrow();
    expect(throwing.setItem).toHaveBeenCalledWith(ACTIVE_CENTER_KEY, "ctr-x");
    Object.defineProperty(window, "sessionStorage", { value: original, configurable: true });
  });

  it("accepts empty-string centerId without throwing", () => {
    expect(() => persistActiveCenterId("")).not.toThrow();
    expect(sessionStorage.getItem(ACTIVE_CENTER_KEY)).toBe("");
  });
});
