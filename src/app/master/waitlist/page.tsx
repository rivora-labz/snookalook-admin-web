import { masterFetchSafe } from "../../../lib/master-api";
import { formatDate } from "../../../lib/datetime";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  status: string;
  notifiedAt: string | null;
  createdAt: string;
}

export default async function WaitlistPage() {
  const { waitlist } = await masterFetchSafe<{ waitlist: WaitlistRow[]; nextCursor: string | null }>(
    "/waitlist",
    { waitlist: [], nextCursor: null },
  );

  const pending = waitlist.filter((w) => w.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold text-th-text">Waitlist</h1>
        <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
          {pending} pending · {waitlist.length} total.
        </p>
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <Th>Email</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Notified</Th>
            </tr>
          </thead>
          <tbody>
            {waitlist.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No waitlist entries yet.
                </td>
              </tr>
            ) : (
              waitlist.map((w) => (
                <tr key={w.id} className="border-b border-th-card last:border-b-0">
                  <Td>{w.email}</Td>
                  <Td className="text-th-text-tertiary">{w.source ?? "—"}</Td>
                  <Td><StatusBadge status={w.status} /></Td>
                  <Td className="text-th-text-tertiary">{formatDate(w.createdAt)}</Td>
                  <Td className="text-th-text-tertiary">
                    {w.notifiedAt ? formatDate(w.notifiedAt) : "—"}
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
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "pending" ? "gold" :
    status === "notified" ? "green" : "neutral";
  const cls = {
    green: "text-[#2ECC71] border-[#2ECC71]/30 bg-[#2ECC71]/10",
    gold: "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10",
    neutral: "text-th-text-tertiary border-th-border bg-th-bg",
  }[tone];
  return <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded uppercase ${cls}`}>{status}</span>;
}
