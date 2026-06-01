import { describe, it, expect } from "vitest";
import {
  AUDIT_ACTION_LABELS,
  humanizeAuditAction,
  summarizeMetadata,
} from "./audit-action-labels";

describe("AUDIT_ACTION_LABELS", () => {
  it("exposes mapped labels for known actions", () => {
    expect(AUDIT_ACTION_LABELS.BOOKING_FORCE_CANCEL).toBe("Force-cancelled booking");
    expect(AUDIT_ACTION_LABELS.BOOKING_NO_SHOW).toBe("Marked as no-show");
    expect(AUDIT_ACTION_LABELS.BOOKING_RESEND_CONFIRMATION).toBe("Re-sent confirmation");
    expect(AUDIT_ACTION_LABELS.BOOKING_RESCHEDULE).toBe("Rescheduled booking");
    expect(AUDIT_ACTION_LABELS.BOOKING_REFUND_ISSUED).toBe("Issued refund");
    expect(AUDIT_ACTION_LABELS.PLAYER_BAN).toBe("Banned player");
    expect(AUDIT_ACTION_LABELS.PLAYER_UNBAN).toBe("Unbanned player");
  });
});

describe("humanizeAuditAction", () => {
  it("returns mapped label for known action", () => {
    expect(humanizeAuditAction("BOOKING_FORCE_CANCEL")).toBe("Force-cancelled booking");
  });

  it("returns mapped label for PLAYER_BAN", () => {
    expect(humanizeAuditAction("PLAYER_BAN")).toBe("Banned player");
  });

  it("falls back to lowercase-space for unknown action", () => {
    expect(humanizeAuditAction("UNKNOWN_FOO_BAR")).toBe("unknown foo bar");
  });

  it("falls back gracefully for empty string", () => {
    expect(humanizeAuditAction("")).toBe("");
  });

  it("preserves single-word unknown actions (just lowercased)", () => {
    expect(humanizeAuditAction("FOO")).toBe("foo");
  });
});

describe("summarizeMetadata", () => {
  it("returns empty string for null", () => {
    expect(summarizeMetadata(null)).toBe("");
  });

  it("returns empty string for empty object", () => {
    expect(summarizeMetadata({})).toBe("");
  });

  it("renders reason when present", () => {
    expect(summarizeMetadata({ reason: "abuse" })).toBe("reason: abuse");
  });

  it("renders note when present", () => {
    expect(summarizeMetadata({ note: "approved by ops" })).toBe("note: approved by ops");
  });

  it("renders refund in AED from fils", () => {
    const out = summarizeMetadata({ refundAmountFils: 5000 });
    expect(out).toMatch(/^refund: /);
    expect(out).toMatch(/AED/);
  });

  it("truncates participantId to first 8 chars", () => {
    expect(summarizeMetadata({ participantId: "abcdefghijklmno" })).toBe("participant: abcdefgh");
  });

  it("renders policy when present", () => {
    expect(summarizeMetadata({ policy: "STRICT" })).toBe("policy: STRICT");
  });

  it("joins multiple fields with ' · '", () => {
    const out = summarizeMetadata({ reason: "x", note: "y", policy: "P" });
    expect(out).toBe("reason: x · note: y · policy: P");
  });

  it("ignores non-string reason", () => {
    expect(summarizeMetadata({ reason: 42 })).toBe("");
  });

  it("ignores non-number refundAmountFils", () => {
    expect(summarizeMetadata({ refundAmountFils: "100" })).toBe("");
  });

  it("ignores unknown keys", () => {
    expect(summarizeMetadata({ foo: "bar", baz: 99 })).toBe("");
  });
});
