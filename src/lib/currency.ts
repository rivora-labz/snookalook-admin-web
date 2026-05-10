/**
 * AED currency formatter — single source of truth for adminweb + master.
 *
 * Invariant I-A #5: money is always carried as fils (integer Long, never float).
 * The util takes `fils: number` and divides by 100 ONCE at the format boundary.
 * Never accept aed-decimal input — risks float drift.
 *
 * Default 2dp matches Stripe + UAE receipt convention. The `decimals?: 0|2` opt
 * exists for KPI rollups + chart axes that prefer compact rounding. A founder
 * flip from 2dp → 0dp default is one constant change here; no callsite churn.
 */

export const DEFAULT_LOCALE = "en-AE";

export interface FormatAEDOptions {
  decimals?: 0 | 2;
  locale?: string;
}

export function formatAED(fils: number, opts: FormatAEDOptions = {}): string {
  const { decimals = 2, locale = DEFAULT_LOCALE } = opts;
  const aed = fils / 100;
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    currencyDisplay: "code",
  });
  return fmt.format(aed);
}
