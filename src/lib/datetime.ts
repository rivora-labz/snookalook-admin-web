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

/** Returns today's date as "YYYY-MM-DD" in the Dubai timezone. */
export function getTodayDubai(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ }).format(new Date());
}

/**
 * Assembles an ISO 8601 start-at string from a yyyy-mm-dd date and a 12-hour
 * time slot string of the form "H:MM AM/PM" (as produced by buildTimeSlots()).
 * Uses the fixed +04:00 Dubai offset (no DST) so slot-lock math on the backend
 * (which is Dubai-local) sees the correct wall-clock time.
 */
export function assembleDubaiStartAt(dateStr: string, slot12h: string): string {
  const spaceIdx = slot12h.lastIndexOf(" ");
  const timePart = slot12h.slice(0, spaceIdx);
  const ampm = slot12h.slice(spaceIdx + 1);
  const colonIdx = timePart.indexOf(":");
  const hourStr = timePart.slice(0, colonIdx);
  const minStr = timePart.slice(colonIdx + 1);
  let h = parseInt(hourStr, 10);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${dateStr}T${String(h).padStart(2, "0")}:${minStr}:00+04:00`;
}
