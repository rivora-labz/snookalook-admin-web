import { formatAED } from "./currency";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  BOOKING_FORCE_CANCEL: "Force-cancelled booking",
  BOOKING_NO_SHOW: "Marked as no-show",
  BOOKING_RESEND_CONFIRMATION: "Re-sent confirmation",
  BOOKING_RESCHEDULE: "Rescheduled booking",
  BOOKING_REFUND_ISSUED: "Issued refund",
  PLAYER_BAN: "Banned player",
  PLAYER_UNBAN: "Unbanned player",
};

export function humanizeAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorDisplayName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function summarizeMetadata(meta: Record<string, unknown> | null): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  const parts: string[] = [];
  if (typeof meta.reason === "string") parts.push(`reason: ${meta.reason}`);
  if (typeof meta.note === "string") parts.push(`note: ${meta.note}`);
  if (typeof meta.refundAmountFils === "number") {
    parts.push(`refund: ${formatAED(meta.refundAmountFils)}`);
  }
  if (typeof meta.participantId === "string") parts.push(`participant: ${meta.participantId.slice(0, 8)}`);
  if (typeof meta.policy === "string") parts.push(`policy: ${meta.policy}`);
  return parts.join(" · ");
}
