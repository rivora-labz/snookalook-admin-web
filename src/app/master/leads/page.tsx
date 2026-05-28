import { masterFetchSafe } from "../../../lib/master-api";
import { formatDate } from "../../../lib/datetime";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  clubName: string;
  contactName: string;
  phone: string;
  tableCount: number;
  location: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

export default async function LeadsPage() {
  const { leads } = await masterFetchSafe<{ leads: Lead[]; nextCursor: string | null }>("/leads", {
    leads: [],
    nextCursor: null,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold text-th-text">Onboarding Leads</h1>
        <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
          Clubs that submitted the partnership form on snookalook.com.
        </p>
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <Th>Club</Th>
              <Th>Contact</Th>
              <Th>Phone</Th>
              <Th align="right">Tables</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No leads yet.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-b border-th-card last:border-b-0 hover:bg-th-bg transition-colors">
                  <Td><strong>{l.clubName}</strong>{l.notes && <div className="text-th-text-tertiary text-[11px] mt-0.5 line-clamp-2">{l.notes}</div>}</Td>
                  <Td>{l.contactName}</Td>
                  <Td><a href={`tel:${l.phone}`} className="text-[#D4AF37] hover:underline">{l.phone}</a></Td>
                  <Td align="right">{l.tableCount}</Td>
                  <Td>{l.location}</Td>
                  <Td><StatusBadge status={l.status} /></Td>
                  <Td>{formatDate(l.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary text-${align}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 font-inter text-[13px] text-th-text text-${align} align-top`}>{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "new" ? "gold" :
    status === "contacted" ? "blue" :
    status === "qualified" ? "blue" :
    status === "converted" ? "green" :
    status === "dead" ? "red" : "neutral";
  const cls = {
    green: "text-[#2ECC71] border-[#2ECC71]/30 bg-[#2ECC71]/10",
    red: "text-[#E74C3C] border-[#E74C3C]/30 bg-[#E74C3C]/10",
    gold: "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10",
    blue: "text-[#3498DB] border-[#3498DB]/30 bg-[#3498DB]/10",
    neutral: "text-th-text-tertiary border-th-border bg-th-bg",
  }[tone];
  return <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded uppercase ${cls}`}>{status}</span>;
}
