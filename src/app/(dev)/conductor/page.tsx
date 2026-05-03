"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AgentGrid, { type AgentCardData } from "../../../components/conductor/AgentGrid";
import ReportsFeed, { type ReportItem } from "../../../components/conductor/ReportsFeed";
import InboxQueue, { type InboxItem } from "../../../components/conductor/InboxQueue";
import ConductorLog from "../../../components/conductor/ConductorLog";
import BriefDrawer from "../../../components/conductor/BriefDrawer";

const FLEET = [
  "android",
  "ios",
  "backend",
  "admin-web",
  "fcm",
  "bnpl-ios",
  "architect",
  "herald",
] as const;

export default function ConductorPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [composeAgent, setComposeAgent] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const r = await fetch("/api/conductor/reports", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setReports(d.items ?? []);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    const r = await fetch("/api/conductor/inbox", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setInbox(d.items ?? []);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadInbox();
    const id = setInterval(() => {
      loadReports();
      loadInbox();
    }, 10_000);
    return () => clearInterval(id);
  }, [loadReports, loadInbox]);

  useEffect(() => {
    if (!selectedReport) {
      setReportContent("");
      return;
    }
    fetch(`/api/conductor/reports/${encodeURIComponent(selectedReport)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setReportContent(d.content ?? ""))
      .catch(() => setReportContent("Failed to load."));
  }, [selectedReport]);

  const agentCards: AgentCardData[] = useMemo(() => {
    const inboxByAgent = new Map(inbox.map((i) => [i.agent, i]));
    const latestByAgent = new Map<string, ReportItem>();
    for (const r of reports) {
      if (!r.agent) continue;
      if (!latestByAgent.has(r.agent)) latestByAgent.set(r.agent, r);
    }
    return FLEET.map((a) => {
      const latest = latestByAgent.get(a) ?? null;
      return {
        agent: a,
        lastReportName: latest?.name ?? null,
        lastReportMtime: latest?.mtime ?? null,
        lastReportStatus: latest?.status ?? null,
        inboxPending: inboxByAgent.has(a),
      };
    });
  }, [reports, inbox]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const onSpawn = useCallback(async (agent: string) => {
    const res = await fetch("/api/conductor/spawn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      showToast(`Spawned ${agent}`);
    } else {
      showToast(`Spawn ${agent} failed: ${data?.stderr ?? data?.error ?? res.status}`);
    }
  }, []);

  const onDeleteInbox = useCallback(async (agent: string) => {
    const res = await fetch(`/api/conductor/inbox?agent=${encodeURIComponent(agent)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Skipped ${agent}.txt`);
      loadInbox();
    } else {
      showToast(`Skip ${agent} failed`);
    }
  }, [loadInbox]);

  return (
    <div>
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl text-th-text">Conductor</h1>
          <p className="mt-0.5 text-xs text-th-text-tertiary">
            Dev-only fleet console. Localhost gate. No prod auth.
          </p>
        </div>
        <button
          onClick={() => {
            loadReports();
            loadInbox();
          }}
          className="rounded-button border border-th-divider px-3 py-1 text-xs text-th-text hover:bg-th-hover"
        >
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-th-divider bg-th-card p-4">
          <h2 className="mb-3 text-sm font-medium text-th-text-secondary">Agents</h2>
          <AgentGrid
            agents={agentCards}
            onSpawn={onSpawn}
            onCompose={(a) => setComposeAgent(a)}
          />
        </section>

        <section className="rounded-card border border-th-divider bg-th-card">
          <div className="border-b border-th-divider px-4 py-2.5">
            <h2 className="text-sm font-medium text-th-text-secondary">Reports (top 30)</h2>
          </div>
          <ReportsFeed
            items={reports}
            selected={selectedReport}
            onSelect={(n) => setSelectedReport(n === selectedReport ? null : n)}
          />
        </section>

        <section className="rounded-card border border-th-divider bg-th-card">
          <div className="border-b border-th-divider px-4 py-2.5">
            <h2 className="text-sm font-medium text-th-text-secondary">Inbox</h2>
          </div>
          <InboxQueue items={inbox} onDelete={onDeleteInbox} />
        </section>

        <section className="rounded-card border border-th-divider bg-th-card p-4">
          <h2 className="mb-3 text-sm font-medium text-th-text-secondary">conductor.log</h2>
          <ConductorLog />
        </section>
      </div>

      {selectedReport && (
        <div className="fixed inset-y-0 right-0 z-20 flex w-[640px] flex-col border-l border-th-divider bg-th-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="truncate font-mono text-sm text-th-text">{selectedReport}</h3>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-th-text-tertiary hover:text-th-text"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded bg-black/40 p-3 font-mono text-[11px] text-th-text">
            {reportContent || "Loading…"}
          </pre>
        </div>
      )}

      {composeAgent && (
        <BriefDrawer
          agent={composeAgent}
          onClose={() => setComposeAgent(null)}
          onSent={() => {
            loadInbox();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 rounded-card border border-th-divider bg-th-card px-4 py-2 text-xs text-th-text shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
