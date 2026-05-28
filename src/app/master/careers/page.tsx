import { masterFetchSafe } from "../../../lib/master-api";
import { formatDate } from "../../../lib/datetime";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface JobApp {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  portfolio: string | null;
  coverLetter: string | null;
  resumeUrl: string | null;
  source: string | null;
  status: string;
  createdAt: string;
}

export default async function CareersPage() {
  const { applications } = await masterFetchSafe<{ applications: JobApp[]; nextCursor: string | null }>(
    "/careers",
    { applications: [], nextCursor: null },
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold text-th-text">Career Applications</h1>
        <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
          {applications.length} application{applications.length === 1 ? "" : "s"}.
        </p>
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Resume</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No applications yet.
                </td>
              </tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-b border-th-card last:border-b-0 hover:bg-th-bg transition-colors">
                  <Td>
                    <strong>{a.name}</strong>
                    {a.coverLetter && (
                      <div className="text-th-text-tertiary text-[11px] mt-0.5 line-clamp-2">{a.coverLetter}</div>
                    )}
                  </Td>
                  <Td>{a.role}</Td>
                  <Td>
                    <a href={`mailto:${a.email}`} className="text-[#D4AF37] hover:underline">{a.email}</a>
                  </Td>
                  <Td>
                    {a.phone ? (
                      <a href={`tel:${a.phone}`} className="text-[#D4AF37] hover:underline">{a.phone}</a>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {a.resumeUrl ? (
                      <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">
                        view
                      </a>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td><StageBadge status={a.status} /></Td>
                  <Td>{formatDate(a.createdAt)}</Td>
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
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 font-inter text-[13px] text-th-text align-top">{children}</td>;
}
function StageBadge({ status }: { status: string }) {
  const tone =
    status === "new" ? "gold" :
    status === "reviewed" ? "blue" :
    status === "interview" ? "blue" :
    status === "hired" ? "green" :
    status === "rejected" ? "red" : "neutral";
  const cls = {
    green: "text-[#2ECC71] border-[#2ECC71]/30 bg-[#2ECC71]/10",
    red: "text-[#E74C3C] border-[#E74C3C]/30 bg-[#E74C3C]/10",
    gold: "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10",
    blue: "text-[#3498DB] border-[#3498DB]/30 bg-[#3498DB]/10",
    neutral: "text-th-text-tertiary border-th-border bg-th-bg",
  }[tone];
  return <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded uppercase ${cls}`}>{status}</span>;
}
