"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch, ApiError } from "../../../../lib/api";
import { formatDateTime } from "../../../../lib/datetime";
import { STATUS_TOKEN, STATUS_TOKEN_TEXT } from "../../../../lib/status-tokens";
import { useStaffSession } from "../../../../lib/use-staff-session";
import Drawer from "../../../../components/Drawer";

type ReportReason =
  | "HARASSMENT"
  | "HATE_SPEECH"
  | "SPAM"
  | "INAPPROPRIATE_CONTENT"
  | "CHEATING"
  | "OTHER";

type Resolution =
  | "NO_ACTION"
  | "USER_WARNED"
  | "CONTENT_REMOVED"
  | "USER_SUSPENDED"
  | "USER_EJECTED";

interface ReportItem {
  id: string;
  reporter: { id: string; displayName: string };
  reportedUser: { id: string; displayName: string } | null;
  chatMessageId: string | null;
  chatMessage: { body: string; bookingId: string } | null;
  reason: ReportReason;
  freeText: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

interface QueueResponse {
  items: ReportItem[];
  nextCursor: string | null;
}

const REASON_LABEL: Record<ReportReason, string> = {
  HARASSMENT: "Harassment",
  HATE_SPEECH: "Hate speech",
  SPAM: "Spam",
  INAPPROPRIATE_CONTENT: "Inappropriate",
  CHEATING: "Cheating",
  OTHER: "Other",
};

interface ResolutionOpt {
  resolution: Resolution;
  label: string;
  confirmLabel: string;
  tone: "neutral" | "amber" | "red";
}

const RESOLUTION_OPTS: ResolutionOpt[] = [
  { resolution: "NO_ACTION", label: "Dismiss", confirmLabel: "Confirm dismiss", tone: "neutral" },
  { resolution: "USER_WARNED", label: "Warn user", confirmLabel: "Confirm warn", tone: "amber" },
  { resolution: "CONTENT_REMOVED", label: "Remove content", confirmLabel: "Confirm remove", tone: "amber" },
  { resolution: "USER_SUSPENDED", label: "Suspend 7d", confirmLabel: "Confirm suspend", tone: "amber" },
  { resolution: "USER_EJECTED", label: "Eject permanently", confirmLabel: "Confirm eject", tone: "red" },
];

const PAGE_SIZE = 25;

function ageHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

interface SlaMeta {
  label: string;
  bg: string;
  fg: string;
  overdue: boolean;
}

function getSlaMeta(createdAt: string): SlaMeta {
  const h = ageHours(createdAt);
  const label = h < 1 ? "<1h" : `${Math.floor(h)}h`;
  if (h >= 22) return { label, bg: STATUS_TOKEN.FAILURE, fg: "#FFFFFF", overdue: true };
  if (h >= 18) return { label, bg: STATUS_TOKEN.WARNING, fg: STATUS_TOKEN_TEXT.WARNING, overdue: false };
  return { label, bg: STATUS_TOKEN.SUCCESS, fg: STATUS_TOKEN_TEXT.SUCCESS, overdue: false };
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function targetLabel(r: ReportItem): string {
  if (r.reportedUser) return r.reportedUser.displayName;
  if (r.chatMessageId) return "Chat message";
  return "—";
}

export default function ModerationQueueClient() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointGap, setEndpointGap] = useState(false);
  const [selected, setSelected] = useState<ReportItem | null>(null);
  const [pendingResolution, setPendingResolution] = useState<Resolution | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [announceMsg, setAnnounceMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { session } = useStaffSession();
  const canMutate = session?.role !== "STAFF";

  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) qs.set("cursor", cursor);
      try {
        const data = await apiFetch<QueueResponse>(
          `/admin/moderation/queue?${qs}`,
          { signal },
        );
        if (signal.aborted) return;
        if (cursor) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor ?? null);
        setError(null);
        setEndpointGap(false);
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.code === "ABORTED") return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          setEndpointGap(true);
          setItems([]);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load moderation queue");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetchPage(null, ctrl.signal);
  }, [fetchPage]);

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingMore(true);
    fetchPage(nextCursor, ctrl.signal);
  };

  const openDrawer = (r: ReportItem) => {
    setSelected(r);
    setPendingResolution(null);
    setNoteText("");
    setResolveError(null);
  };

  const closeDrawer = () => {
    if (submitting) return;
    setSelected(null);
    setPendingResolution(null);
    setNoteText("");
    setResolveError(null);
  };

  const submitResolution = async () => {
    if (!selected || !pendingResolution) return;
    setSubmitting(true);
    setResolveError(null);
    try {
      await apiFetch(`/admin/moderation/reports/${selected.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          resolution: pendingResolution,
          ...(noteText.trim() ? { freeText: noteText.trim() } : {}),
        }),
      });
      setAnnounceMsg(
        `Report ${shortId(selected.id)} resolved: ${pendingResolution}.`,
      );
      closeDrawer();
      refresh();
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Failed to resolve report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const liveRegion = (
    <div role="status" aria-live="polite" className="sr-only">
      {announceMsg ||
        (loading
          ? "Loading moderation queue…"
          : `${items.length} report${items.length === 1 ? "" : "s"} shown`)}
    </div>
  );

  if (endpointGap) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-[#F39C12]/40 bg-[#F39C12]/10 p-4 text-xs text-[#F39C12]">
          <p>
            Backend <code>GET /v1/admin/moderation/queue</code> not reachable. Endpoint gap.
          </p>
          <button
            onClick={refresh}
            className="mt-3 rounded-button border border-[#F39C12]/60 px-3 py-1 text-xs font-medium text-[#F39C12] hover:bg-[#F39C12]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F39C12]"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        {liveRegion}
        <div className="overflow-hidden rounded-card border border-th-divider bg-th-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse border-b border-th-divider last:border-0"
            />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {liveRegion}
        <div className="rounded-card border border-th-divider bg-th-card p-12 text-center">
          <p className="text-lg font-medium text-th-text">No pending reports</p>
          <p className="mt-1 text-sm text-th-text-secondary">Queue is clear.</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text-secondary hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
          >
            Refresh
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {liveRegion}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-th-text-secondary">
          {items.length} report{items.length === 1 ? "" : "s"}
          {nextCursor ? "+" : ""}
        </span>
        <button
          onClick={refresh}
          className="rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text-secondary hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-th-divider bg-th-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Moderation queue">
            <thead className="bg-th-bg text-xs uppercase tracking-wide text-th-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Reporter</th>
                <th className="px-4 py-3 text-left font-medium">Target</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-left font-medium">Age</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const sla = getSlaMeta(r.createdAt);
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-th-divider ${sla.overdue ? "bg-[#E74C3C]/5" : ""}`}
                  >
                    <td className="px-4 py-3 text-th-text">
                      {r.reporter.displayName}
                    </td>
                    <td className="px-4 py-3 text-th-text-secondary">
                      {r.chatMessage ? (
                        <span
                          className="line-clamp-1 max-w-[140px] text-xs"
                          title={r.chatMessage.body}
                        >
                          &ldquo;{r.chatMessage.body}&rdquo;
                        </span>
                      ) : (
                        <span>{targetLabel(r)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-pill border border-th-divider bg-th-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-th-text-secondary">
                        {REASON_LABEL[r.reason] ?? r.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-th-text-secondary">
                      {r.freeText ? (
                        <span
                          className="line-clamp-1 max-w-[160px]"
                          title={r.freeText}
                        >
                          {r.freeText}
                        </span>
                      ) : (
                        <span className="text-th-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: sla.bg, color: sla.fg }}
                        aria-label={`${sla.label} in queue${sla.overdue ? " — overdue" : ""}`}
                      >
                        {sla.label}
                        {sla.overdue ? " ⚠" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] uppercase tracking-wide text-th-text-secondary">
                      {r.status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDrawer(r)}
                        className="rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text-secondary hover:border-th-gold hover:text-th-text focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
                        aria-label={`Review report from ${r.reporter.displayName}`}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="border-t border-th-divider p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-button border border-th-divider px-4 py-2 text-xs text-th-text-secondary hover:text-th-text disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      <Drawer
        isOpen={selected !== null}
        onClose={closeDrawer}
        title="Report detail"
        width="480px"
      >
        {selected && (
          <ReportDetailPanel
            report={selected}
            canMutate={canMutate}
            pendingResolution={pendingResolution}
            setPendingResolution={setPendingResolution}
            noteText={noteText}
            setNoteText={setNoteText}
            submitting={submitting}
            resolveError={resolveError}
            onSubmit={submitResolution}
            onBack={() => setPendingResolution(null)}
          />
        )}
      </Drawer>
    </>
  );
}

interface ReportDetailPanelProps {
  report: ReportItem;
  canMutate: boolean;
  pendingResolution: Resolution | null;
  setPendingResolution: (r: Resolution | null) => void;
  noteText: string;
  setNoteText: (s: string) => void;
  submitting: boolean;
  resolveError: string | null;
  onSubmit: () => void;
  onBack: () => void;
}

function ReportDetailPanel({
  report,
  canMutate,
  pendingResolution,
  setPendingResolution,
  noteText,
  setNoteText,
  submitting,
  resolveError,
  onSubmit,
  onBack,
}: ReportDetailPanelProps) {
  const sla = getSlaMeta(report.createdAt);
  const chosenOpt = RESOLUTION_OPTS.find((o) => o.resolution === pendingResolution);

  return (
    <div className="flex flex-col gap-5">
      {/* Meta grid */}
      <section className="rounded-card border border-th-divider bg-th-bg p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-th-text-tertiary">Report ID</dt>
            <dd className="mt-0.5 font-mono text-th-text">{shortId(report.id)}</dd>
          </div>
          <div>
            <dt className="text-th-text-tertiary">Filed</dt>
            <dd className="mt-0.5 text-th-text">{formatDateTime(report.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-th-text-tertiary">Reporter</dt>
            <dd className="mt-0.5 text-th-text">{report.reporter.displayName}</dd>
          </div>
          <div>
            <dt className="text-th-text-tertiary">Target</dt>
            <dd className="mt-0.5 text-th-text">{targetLabel(report)}</dd>
          </div>
          <div>
            <dt className="text-th-text-tertiary">Status</dt>
            <dd className="mt-0.5 text-[10px] uppercase tracking-wide text-th-text">
              {report.status}
            </dd>
          </div>
          <div>
            <dt className="text-th-text-tertiary">Age / SLA</dt>
            <dd className="mt-0.5">
              <span
                className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: sla.bg, color: sla.fg }}
              >
                {sla.label}
                {sla.overdue ? " — OVERDUE" : ""}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Reason */}
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-th-text-tertiary">
          Reason
        </h3>
        <p className="rounded-card border border-th-divider bg-th-bg p-3 text-sm text-th-text">
          {REASON_LABEL[report.reason] ?? report.reason}
        </p>
        {report.freeText && (
          <blockquote className="mt-2 rounded-card border border-th-divider bg-th-bg p-3 text-sm text-th-text-secondary">
            &ldquo;{report.freeText}&rdquo;
          </blockquote>
        )}
      </section>

      {/* Chat message context */}
      {report.chatMessage && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-th-text-tertiary">
            Reported message
          </h3>
          <div className="rounded-card border border-th-divider bg-th-bg p-3 text-sm text-th-text">
            {report.chatMessage.body}
          </div>
          <p className="mt-1 text-[10px] text-th-text-tertiary">
            Booking: {shortId(report.chatMessage.bookingId)}
          </p>
        </section>
      )}

      {/* Resolution */}
      {canMutate ? (
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-th-text-tertiary">
            Resolution
          </h3>
          {!pendingResolution ? (
            <div className="grid grid-cols-2 gap-2">
              {RESOLUTION_OPTS.map((opt) => (
                <button
                  key={opt.resolution}
                  onClick={() => setPendingResolution(opt.resolution)}
                  className={`rounded-button border px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold ${
                    opt.tone === "red"
                      ? "border-[#E74C3C]/40 text-[#E74C3C] hover:bg-[#E74C3C]/10"
                      : opt.tone === "amber"
                        ? "border-[#F39C12]/40 text-[#F39C12] hover:bg-[#F39C12]/10"
                        : "border-th-divider text-th-text-secondary hover:bg-th-hover hover:text-th-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-th-divider bg-th-bg p-4">
              <p className="mb-3 text-sm font-medium text-th-text">
                Confirm:{" "}
                <span
                  className={
                    chosenOpt?.tone === "red" ? "text-[#E74C3C]" : "text-[#F39C12]"
                  }
                >
                  {chosenOpt?.label}
                </span>
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-th-text-tertiary">
                  Note (optional, max 500 chars)
                </span>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Admin note — stored with resolution."
                  className="rounded-button border border-th-divider bg-th-card px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
                />
                <span className="text-right text-[10px] text-th-text-tertiary">
                  {noteText.length}/500
                </span>
              </label>
              {resolveError && (
                <p className="mt-2 text-xs text-[#E74C3C]">{resolveError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className={`rounded-button px-4 py-2 text-sm font-medium text-black disabled:opacity-50 ${
                    chosenOpt?.tone === "red"
                      ? "bg-[#E74C3C] hover:bg-[#C0392B]"
                      : "bg-th-gold hover:bg-th-gold-hover"
                  }`}
                >
                  {submitting ? "Submitting…" : chosenOpt?.confirmLabel}
                </button>
                <button
                  onClick={onBack}
                  disabled={submitting}
                  className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:text-th-text disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-th-gold"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-card border border-th-divider bg-th-bg p-3 text-xs text-th-text-tertiary">
          OWNER or MANAGER role required to resolve reports.
        </p>
      )}
    </div>
  );
}
