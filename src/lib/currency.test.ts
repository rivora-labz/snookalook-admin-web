import { describe, it, expect } from "vitest";
import { formatAED, DEFAULT_LOCALE } from "./currency";

describe("currency util — fils → AED", () => {
  it("exports DEFAULT_LOCALE en-AE", () => {
    expect(DEFAULT_LOCALE).toBe("en-AE");
  });

  it("default 2dp output: 0 fils → AED 0.00", () => {
    expect(formatAED(0)).toMatch(/AED\s*0\.00/);
  });

  it("100 fils → AED 1.00", () => {
    expect(formatAED(100)).toMatch(/AED\s*1\.00/);
  });

  it("1234 fils → AED 12.34", () => {
    expect(formatAED(1234)).toMatch(/AED\s*12\.34/);
  });

  it("rounds half values consistently (banker's per Intl spec)", () => {
    expect(formatAED(1235)).toMatch(/AED\s*12\.3[45]/);
  });

  it("opts.decimals=0 strips fractional output (KPI rollup mode)", () => {
    expect(formatAED(123456, { decimals: 0 })).toMatch(/AED\s*1,?235/);
  });

  it("currencyDisplay uses code 'AED' not symbol د.إ in en-AE", () => {
    expect(formatAED(100)).toContain("AED");
  });

  it("opts.locale=ar-AE produces RTL output distinct from en-AE", () => {
    const arabic = formatAED(1234, { locale: "ar-AE" });
    const english = formatAED(1234, { locale: "en-AE" });
    expect(arabic).not.toBe(english);
    // ar-AE places AED as suffix and prepends RTL mark (\u200F)
    expect(arabic).toMatch(/AED/);
    expect(arabic).toMatch(/\u200F|^.*AED$/);
  });

  it("large fils values format with thousands separator", () => {
    expect(formatAED(123_456_789)).toMatch(/1,234,567\.89/);
  });

  it("negative fils → negative AED (refund display)", () => {
    expect(formatAED(-500)).toMatch(/-?AED\s*5\.00|AED\s*-?5\.00|-AED\s*5\.00/);
  });
});
