"use client";

import { useEffect, useState } from "react";

export default function ConductorLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (paused) return;
      try {
        const res = await fetch("/api/conductor/log?lines=200", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { lines: string[] };
        if (!cancelled) {
          setLines(data.lines);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    };
    tick();
    const id = setInterval(tick, 3_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [paused]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-th-text-secondary">
          {lines.length} lines{error ? ` · ${error}` : ""}
        </span>
        <button
          onClick={() => setPaused((p) => !p)}
          className="rounded border border-th-divider px-2 py-0.5 text-[10px] text-th-text-secondary hover:bg-th-hover"
        >
          {paused ? "resume" : "pause"}
        </button>
      </div>
      <div
        className="flex-1 overflow-y-auto rounded bg-black/40 p-2 font-mono text-[10px] text-th-text"
        style={{ maxHeight: 480 }}
      >
        {lines.length === 0 ? (
          <div className="text-th-text-tertiary">No log lines.</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
