import KpiGrid, { KpiCard } from "../../../components/master/KpiGrid";
import { masterFetchOrError } from "../../../lib/master-api";
import { formatAED } from "../../../lib/currency";
import { formatDateTime } from "../../../lib/datetime";

export const dynamic = "force-dynamic";

interface Overview {
  centers: { total: number; active: number; archived: number };
  players: { total: number; banned: number };
  bookings: { total: number; last7d: number; last30d: number };
  revenue: { totalFils: number; last30dFils: number };
  disputes: { open: number; resolved: number };
  leads: { total: number; new: number };
  newsletter: { active: number; total: number };
  careers: { total: number; new: number };
  waitlist: { total: number };
  staff: { admins: number; founders: number };
  generatedAt: string;
}

const FALLBACK: Overview = {
  centers: { total: 0, active: 0, archived: 0 },
  players: { total: 0, banned: 0 },
  bookings: { total: 0, last7d: 0, last30d: 0 },
  revenue: { totalFils: 0, last30dFils: 0 },
  disputes: { open: 0, resolved: 0 },
  leads: { total: 0, new: 0 },
  newsletter: { active: 0, total: 0 },
  careers: { total: 0, new: 0 },
  waitlist: { total: 0 },
  staff: { admins: 0, founders: 0 },
  generatedAt: new Date().toISOString(),
};

const aed = (fils: number) => formatAED(fils, { decimals: 0 });

export default async function OverviewPage() {
  const { data, error } = await masterFetchOrError<Overview>("/overview", FALLBACK);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-th-text">
            Platform Overview
          </h1>
          <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
            God-view aggregates across every Snook A Look center.
          </p>
        </div>
        <div className="font-inter text-[11px] text-th-text-tertiary">
          Generated {formatDateTime(data.generatedAt)}
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-[#E74C3C]/40 bg-[#E74C3C]/10 p-4 font-mono text-[12px] text-[#E74C3C]">
          <div className="font-semibold mb-1">Master API fetch failed (showing zeros as fallback):</div>
          <div className="break-all">{error}</div>
        </div>
      )}

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">
          Network
        </h2>
        <KpiGrid>
          <KpiCard label="Centers" value={data.centers.active} sub={`${data.centers.archived} archived`} accent="gold" />
          <KpiCard label="Players" value={data.players.total.toLocaleString()} sub={`${data.players.banned} banned`} accent="blue" />
          <KpiCard label="Staff" value={data.staff.admins + data.staff.founders} sub={`${data.staff.founders} founder${data.staff.founders === 1 ? "" : "s"}`} accent="neutral" />
          <KpiCard label="Open Disputes" value={data.disputes.open} accent={data.disputes.open > 0 ? "red" : "neutral"} />
        </KpiGrid>
      </section>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">
          Bookings & Revenue
        </h2>
        <KpiGrid>
          <KpiCard label="Bookings (total)" value={data.bookings.total.toLocaleString()} accent="gold" />
          <KpiCard label="Bookings · 30d" value={data.bookings.last30d.toLocaleString()} sub={`${data.bookings.last7d} in last 7d`} accent="blue" />
          <KpiCard label="Revenue (total)" value={aed(data.revenue.totalFils)} accent="green" />
          <KpiCard label="Revenue · 30d" value={aed(data.revenue.last30dFils)} accent="green" />
        </KpiGrid>
      </section>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">
          Inbound Pipeline
        </h2>
        <KpiGrid>
          <KpiCard label="Onboarding Leads" value={data.leads.total} sub={`${data.leads.new} new`} accent="gold" />
          <KpiCard label="Newsletter" value={data.newsletter.active} sub="active subscribers" accent="blue" />
          <KpiCard label="Career Apps" value={data.careers.total} sub={`${data.careers.new} new`} accent="neutral" />
          <KpiCard label="Waitlist" value={data.waitlist.total} accent="neutral" />
        </KpiGrid>
      </section>
    </div>
  );
}
