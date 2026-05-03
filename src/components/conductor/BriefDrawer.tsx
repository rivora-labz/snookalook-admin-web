"use client";

import { useState } from "react";

export default function BriefDrawer({
  agent,
  onClose,
  onSent,
}: {
  agent: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/conductor/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `status ${res.status}`);
      setResult(data?.mode === "pointer" ? `Pointer → ${data.briefPath}` : `Wrote ${data.path}`);
      setContent("");
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-[480px] flex-col border-l border-th-divider bg-th-card p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-th-text">
          Compose Brief — <span className="font-mono text-th-gold">{agent}</span>
        </h3>
        <button
          onClick={onClose}
          className="text-th-text-tertiary hover:text-th-text"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Brief for ${agent}. >1500 bytes auto-splits to agents/briefs/${agent}-{ts}.md with pointer in inbox.`}
        className="flex-1 resize-none rounded border border-th-divider bg-th-bg p-3 font-mono text-xs text-th-text outline-none focus:border-th-gold"
      />
      <div className="mt-2 flex items-center justify-between text-[10px] text-th-text-tertiary">
        <span>{new TextEncoder().encode(content).length} bytes</span>
        <span>{content.length > 1500 ? "→ pointer" : "inline"}</span>
      </div>
      {result && <div className="mt-2 text-xs text-[#2ECC71]">{result}</div>}
      {error && <div className="mt-2 text-xs text-[#E74C3C]">{error}</div>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onClose}
          className="rounded-button border border-th-divider px-3 py-1.5 text-xs text-th-text hover:bg-th-hover"
        >
          Cancel
        </button>
        <button
          onClick={send}
          disabled={busy || content.length === 0}
          className="flex-1 rounded-button bg-th-gold px-3 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
