import { masterFetchSafe } from "../../../lib/master-api";
import { formatDateTime } from "../../../lib/datetime";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  actor: { id: string; displayName: string; avatarUrl: string | null } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  centerId: string | null;
  metadata: Record<string, unknown>;
  redacted: boolean;
  createdAt: string;
}

export default async function AuditPage() {
  const { rows } = await masterFetchSafe<{ rows: AuditRow[]; nextCursor: string | null }>(
    "/audit",
    { rows: [], nextCursor: null },
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-th-text">Audit Log</h1>
          <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
            Last {rows.length} platform events.
          </p>
        </div>
        <a
          href="/api/master/audit/export"
          className="font-inter text-[12px] text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-3 py-1.5 rounded uppercase tracking-[0.12em]"
        >
          Export CSV
        </a>
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <Th>Time</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Metadata</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No audit events yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-th-card last:border-b-0 align-top">
                  <Td className="font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </Td>
                  <Td>{r.actor?.displayName ?? "—"}</Td>
                  <Td>
                    <span className="font-mono text-[11px] text-th-text uppercase tracking-[0.06em]">{r.action}</span>
                  </Td>
                  <Td className="font-mono text-[11px] text-th-text-tertiary">
                    {r.entityType}
                    {r.entityId ? (
                      <div className="text-[10px] truncate max-w-[160px]">{r.entityId}</div>
                    ) : null}
                  </Td>
                  <Td>
                    {r.redacted ? (
                      <span className="font-inter text-[11px] text-th-text-tertiary italic">redacted</span>
                    ) : Object.keys(r.metadata ?? {}).length === 0 ? (
                      <span className="text-th-text-tertiary">—</span>
                    ) : (
                      <details className="font-mono text-[10px] text-th-text-tertiary">
                        <summary className="cursor-pointer text-th-text">view</summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all max-w-[420px]">
                          {JSON.stringify(r.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 font-inter text-[13px] text-th-text ${className}`}>{children}</td>;
}
