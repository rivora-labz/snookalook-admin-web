import { describe, it, expect } from "vitest";
import { STATUS_TOKEN, STATUS_TOKEN_TEXT, type StatusSemantic } from "./status-tokens";

describe("STATUS_TOKEN", () => {
  it("exposes all six documented semantics", () => {
    const keys: StatusSemantic[] = ["ACTIVE", "SUCCESS", "WARNING", "FAILURE", "INFO", "NEUTRAL"];
    for (const k of keys) {
      expect(STATUS_TOKEN[k]).toBeDefined();
    }
    expect(Object.keys(STATUS_TOKEN)).toHaveLength(6);
  });

  it("uses canonical hex values for each semantic", () => {
    expect(STATUS_TOKEN.ACTIVE).toBe("#3498DB");
    expect(STATUS_TOKEN.SUCCESS).toBe("#27AE60");
    expect(STATUS_TOKEN.WARNING).toBe("#F39C12");
    expect(STATUS_TOKEN.FAILURE).toBe("#E74C3C");
    expect(STATUS_TOKEN.INFO).toBe("#9B59B6");
    expect(STATUS_TOKEN.NEUTRAL).toBe("#95A5A6");
  });

  it("each token is a 7-char uppercase hex string", () => {
    for (const v of Object.values(STATUS_TOKEN)) {
      expect(v).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("no two tokens share the same hex (each semantic claims its own colour)", () => {
    const values = Object.values(STATUS_TOKEN);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("STATUS_TOKEN_TEXT", () => {
  it("provides a text colour for every semantic in STATUS_TOKEN", () => {
    for (const k of Object.keys(STATUS_TOKEN) as StatusSemantic[]) {
      expect(STATUS_TOKEN_TEXT[k]).toBeDefined();
    }
  });

  it("INFO uses white text against purple bg (AA-borderline by docstring)", () => {
    expect(STATUS_TOKEN_TEXT.INFO).toBe("#FFFFFF");
  });

  it("non-INFO semantics use dark-grey text #1A1A1A", () => {
    expect(STATUS_TOKEN_TEXT.ACTIVE).toBe("#1A1A1A");
    expect(STATUS_TOKEN_TEXT.SUCCESS).toBe("#1A1A1A");
    expect(STATUS_TOKEN_TEXT.WARNING).toBe("#1A1A1A");
    expect(STATUS_TOKEN_TEXT.FAILURE).toBe("#1A1A1A");
    expect(STATUS_TOKEN_TEXT.NEUTRAL).toBe("#1A1A1A");
  });

  it("every text colour is a valid 7-char uppercase hex", () => {
    for (const v of Object.values(STATUS_TOKEN_TEXT)) {
      expect(v).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
