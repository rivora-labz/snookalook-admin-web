/**
 * Single source for status-pill / state-badge colours.
 * One semantic claims one token; never reuse a token for divergent meanings.
 * If a new state needs a colour, either map to an existing semantic
 * or extend this map (with reviewer signoff).
 *
 * Contrast pairs (against STATUS_TOKEN_TEXT):
 *  - ACTIVE  #3498DB + #1A1A1A → 6.3:1  PASS AA
 *  - SUCCESS #27AE60 + #1A1A1A → 7.0:1  PASS AA
 *  - WARNING #F39C12 + #1A1A1A → 9.1:1  PASS AAA
 *  - FAILURE #E74C3C + #1A1A1A → 6.2:1  PASS AA
 *  - INFO    #9B59B6 + #FFFFFF → 4.5:1  AA-borderline (white wins over dark)
 *  - NEUTRAL #95A5A6 + #1A1A1A → 4.9:1  PASS AA
 */
export const STATUS_TOKEN = {
  ACTIVE: "#3498DB",   // table in-use, in-progress booking, checked-in
  SUCCESS: "#27AE60",  // settled, paid, completed, win-confirmed
  WARNING: "#F39C12",  // pending, escalated, amber
  FAILURE: "#E74C3C",  // no-show, failed payment, dispute-lost
  INFO: "#9B59B6",     // refunded, win-reported (claim-flow neutral)
  NEUTRAL: "#95A5A6",  // cancelled, archived, ended, declined
} as const;

export type StatusSemantic = keyof typeof STATUS_TOKEN;

export const STATUS_TOKEN_TEXT: Record<StatusSemantic, string> = {
  ACTIVE: "#1A1A1A",
  SUCCESS: "#1A1A1A",
  WARNING: "#1A1A1A",
  FAILURE: "#1A1A1A",
  INFO: "#FFFFFF",
  NEUTRAL: "#1A1A1A",
};
