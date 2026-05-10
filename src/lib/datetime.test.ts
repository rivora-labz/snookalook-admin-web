import { describe, it, expect } from "vitest";
import {
  DUBAI_TZ,
  DEFAULT_LOCALE,
  formatDate,
  formatTime,
  formatDateTime,
  formatDateShort,
} from "./datetime";

const REF_ISO = "2026-05-10T20:30:00Z"; // 00:30 next day in Dubai (UTC+4)

describe("datetime util — Asia/Dubai default", () => {
  it("exports DUBAI_TZ + DEFAULT_LOCALE constants", () => {
    expect(DUBAI_TZ).toBe("Asia/Dubai");
    expect(DEFAULT_LOCALE).toBe("en-AE");
  });

  it("formatTime renders Dubai-local hour, not viewer/runtime UTC", () => {
    expect(formatTime(REF_ISO)).toBe("00:30");
  });

  it("formatDate uses en-AE day-month-year", () => {
    expect(formatDate(REF_ISO)).toMatch(/11\s+May\s+2026/);
  });

  it("formatDateShort omits year by default", () => {
    expect(formatDateShort(REF_ISO)).toMatch(/^11\s+May$/);
  });

  it("formatDateTime combines date + 24h time", () => {
    const out = formatDateTime(REF_ISO);
    expect(out).toMatch(/11\s+May\s+2026/);
    expect(out).toMatch(/00:30/);
  });

  it("opts.locale overrides default locale (en-GB → 12h or distinct)", () => {
    const enUS = formatTime(REF_ISO, { locale: "en-US", hour12: true });
    expect(enUS).toMatch(/AM|PM/);
  });

  it("opts override base options (extend with weekday)", () => {
    const out = formatDateShort(REF_ISO, { weekday: "short" });
    expect(out).toMatch(/Mon/);
  });

  it("accepts Date | string | number inputs", () => {
    const d = new Date(REF_ISO);
    expect(formatTime(d)).toBe("00:30");
    expect(formatTime(d.getTime())).toBe("00:30");
    expect(formatTime(REF_ISO)).toBe("00:30");
  });

  it("Dubai TZ shifts day boundary correctly (no-DST UTC+4)", () => {
    // 19:59 UTC same calendar day → 23:59 Dubai
    expect(formatTime("2026-05-10T19:59:00Z")).toBe("23:59");
    // 20:00 UTC → 00:00 next day Dubai
    expect(formatTime("2026-05-10T20:00:00Z")).toBe("00:00");
  });
});
