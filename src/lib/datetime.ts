/**
 * Asia/Dubai-defaulted datetime formatters.
 *
 * Why: SSR runs on Vercel (UTC); browsers vary by viewer locale. Bare
 * `toLocaleString()` renders different times for the same event depending on
 * who's looking. UAE business operates in Asia/Dubai (UTC+4) — every admin
 * surface must render Dubai time regardless of viewer locale.
 *
 * Cross-pane invariant (C-13 candidate): mobile (Models.kt, DateUtil.kt) also
 * defaults TimeZone.of("Asia/Dubai"). Adminweb here mirrors that.
 */

export const DUBAI_TZ = "Asia/Dubai";
export const DEFAULT_LOCALE = "en-AE";

export type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

export type FormatOptions = Omit<Intl.DateTimeFormatOptions, "timeZone"> & {
  locale?: string;
};

const DEFAULT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const DEFAULT_TIME: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const DEFAULT_DATETIME: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE,
  ...DEFAULT_TIME,
};

function format(input: DateInput, base: Intl.DateTimeFormatOptions, opts?: FormatOptions): string {
  const { locale = DEFAULT_LOCALE, ...overrides } = opts ?? {};
  const fmt = new Intl.DateTimeFormat(locale, {
    ...base,
    ...overrides,
    timeZone: DUBAI_TZ,
  });
  return fmt.format(toDate(input));
}

export function formatDate(input: DateInput, opts?: FormatOptions): string {
  return format(input, DEFAULT_DATE, opts);
}

export function formatTime(input: DateInput, opts?: FormatOptions): string {
  return format(input, DEFAULT_TIME, opts);
}

export function formatDateTime(input: DateInput, opts?: FormatOptions): string {
  return format(input, DEFAULT_DATETIME, opts);
}

export function formatDateShort(input: DateInput, opts?: FormatOptions): string {
  return format(input, { day: "numeric", month: "short" }, opts);
}
