import { masterFetchSafe } from "../../../lib/master-api";
import { formatDate } from "../../../lib/datetime";

export const dynamic = "force-dynamic";

interface Sub {
  id: string;
  email: string;
  status: string;
  source: string | null;
  createdAt: string;
  unsubscribedAt: string | null;
}

export default async function NewsletterPage() {
  const { subscribers } = await masterFetchSafe<{ subscribers: Sub[]; nextCursor: string | null }>(
    "/newsletter",
    { subscribers: [], nextCursor: null },
  );

  const active = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold text-th-text">Newsletter</h1>
        <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
          {active} active · {subscribers.length} total subscribers
        </p>
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Email</th>
              <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Status</th>
              <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Source</th>
              <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Subscribed</th>
              <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Unsubscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No subscribers yet.
                </td>
              </tr>
            ) : subscribers.map((s) => (
              <tr key={s.id} className="border-b border-th-card last:border-b-0">
                <td className="px-4 py-3 font-inter text-[13px] text-th-text">{s.email}</td>
                <td className="px-4 py-3 font-inter text-[12px] uppercase">{s.status}</td>
                <td className="px-4 py-3 font-inter text-[12px] text-th-text-tertiary">{s.source ?? "—"}</td>
                <td className="px-4 py-3 font-inter text-[12px] text-th-text-tertiary">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 font-inter text-[12px] text-th-text-tertiary">{s.unsubscribedAt ? formatDate(s.unsubscribedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
