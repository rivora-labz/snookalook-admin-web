import Link from "next/link";
import type { Route } from "next";
import { masterFetchSafe } from "../../../lib/master-api";
import { formatAED } from "../../../lib/currency";
import { formatDate } from "../../../lib/datetime";
import CreateCenterButton from "./CreateCenterButton";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface CenterRow {
  id: string;
  name: string;
  city: string;
  address: string;
  rating: number | null;
  heroImage: string | null;
  priceMin: number;
  priceMax: number;
  isFeatured: boolean;
  isSuspended: boolean;
  archivedAt: string | null;
  createdAt: string;
  staffCount: number;
  tableCount: number;
  bookings30d: number;
  revenue30dFils: number;
  lastBookingAt: string | null;
}

const aed = (fils: number) => formatAED(fils, { decimals: 0 });

export default async function CentersPage() {
  const { centers } = await masterFetchSafe<{ centers: CenterRow[] }>("/centers", { centers: [] });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-th-text">Centers</h1>
          <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
            All Snook A Look venues. Click a row to drill in.
          </p>
        </div>
        <CreateCenterButton />
      </header>

      <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-th-bg border-b border-th-border">
            <tr>
              <Th>Center</Th>
              <Th>City</Th>
              <Th align="right">Tables</Th>
              <Th align="right">Staff</Th>
              <Th align="right">30d bookings</Th>
              <Th align="right">30d revenue</Th>
              <Th>Last booking</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {centers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-inter text-[13px] text-th-text-tertiary">
                  No centers found.
                </td>
              </tr>
            ) : (
              centers.map((c) => (
                <tr key={c.id} className="border-b border-th-card last:border-b-0 hover:bg-th-bg transition-colors">
                  <Td>
                    <Link href={`/master/centers/${c.id}` as Route} className="text-[#D4AF37] hover:underline font-medium">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.city}</Td>
                  <Td align="right">{c.tableCount}</Td>
                  <Td align="right">{c.staffCount}</Td>
                  <Td align="right">{c.bookings30d.toLocaleString()}</Td>
                  <Td align="right">{aed(c.revenue30dFils)}</Td>
                  <Td>{c.lastBookingAt ? formatDate(c.lastBookingAt) : "—"}</Td>
                  <Td>
                    {c.archivedAt ? (
                      <Badge tone="red">Archived</Badge>
                    ) : c.isSuspended ? (
                      <Badge tone="red">Suspended</Badge>
                    ) : c.isFeatured ? (
                      <Badge tone="gold">Featured</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
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

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary text-${align}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`px-4 py-3 font-inter text-[13px] text-th-text text-${align}`}>
      {children}
    </td>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "red" | "gold" | "neutral" }) {
  const cls = {
    green: "text-[#2ECC71] border-[#2ECC71]/30 bg-[#2ECC71]/10",
    red: "text-[#E74C3C] border-[#E74C3C]/30 bg-[#E74C3C]/10",
    gold: "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10",
    neutral: "text-th-text-tertiary border-th-border bg-th-bg",
  }[tone];
  return <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded uppercase ${cls}`}>{children}</span>;
}
