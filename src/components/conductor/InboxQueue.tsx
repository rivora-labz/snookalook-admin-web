"use client";

export interface InboxItem {
  agent: string;
  sizeBytes: number;
  mtime: number;
  isPointer: boolean;
  pointerTarget: string | null;
}

export default function InboxQueue({
  items,
  onDelete,
}: {
  items: InboxItem[];
  onDelete: (agent: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-th-text-tertiary">Inbox empty.</div>
    );
  }
  return (
    <ul className="divide-y divide-th-divider">
      {items.map((i) => (
        <li key={i.agent} className="flex items-center gap-2 px-3 py-2 text-xs">
          <span className="rounded-pill bg-th-divider px-1.5 py-0.5 font-mono text-[10px] text-th-text-secondary">
            {i.agent}
          </span>
          {i.isPointer && i.pointerTarget && (
            <span
              className="truncate text-[10px] text-th-text-tertiary"
              title={i.pointerTarget}
            >
              → {i.pointerTarget}
            </span>
          )}
          {!i.isPointer && (
            <span className="text-[10px] text-th-text-tertiary">{i.sizeBytes}B inline</span>
          )}
          <span className="flex-1" />
          <span className="text-[10px] text-th-text-tertiary">
            {new Date(i.mtime).toLocaleString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => onDelete(i.agent)}
            className="rounded border border-th-divider px-1.5 py-0.5 text-[10px] text-th-text-secondary hover:bg-th-hover"
            title="Rename to .skip (non-destructive)"
          >
            skip
          </button>
        </li>
      ))}
    </ul>
  );
}
