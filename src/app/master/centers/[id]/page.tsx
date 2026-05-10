import Link from "next/link";
import type { Route } from "next";
import { masterFetchSafe } from "../../../../lib/master-api";
import { formatAED } from "../../../../lib/currency";
import { formatDate, formatDateTime } from "../../../../lib/datetime";

export const dynamic = "force-dynamic";

interface CenterDetail {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    lat: number;
    lng: number;
    heroImage: string | null;
    rating: number | null;
    priceMin: number;
    priceMax: number;
    hoursOpen: string;
    hoursClose: string;
    isFeatured: boolean;
    isSuspended: boolean;
    archivedAt: string | null;
    createdAt: string;
    settings: unknown;
    photos: Array<{ id: string; url: string; sortOrder: number }>;
    staff: Array<{
      id: string;
      role: string;
      createdAt: string;
      user: { id: string; displayName: string; phone: string; email: string | null; avatarUrl: string | null };
    }>;
    tables: Array<{ id: string; tableNumber: number; tableType: string; status: string }>;
  };
  recentBookings: Array<{
    id: string;
    state: string;
    startsAt: string;
    durationMinutes: number;
    createdAt: string;
    host: { id: string; displayName: string; phone: string };
    payment: { amount: number; status: string; method: string } | null;
  }>;
}

const FALLBACK: CenterDetail = {
  center: {
    id: "",
    name: "Center not found",
    city: "",
    address: "",
    lat: 0,
    lng: 0,
    heroImage: null,
    rating: null,
    priceMin: 0,
    priceMax: 0,
    hoursOpen: "—",
    hoursClose: "—",
    isFeatured: false,
    isSuspended: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    settings: null,
    photos: [],
    staff: [],
    tables: [],
  },
  recentBookings: [],
};

const aed = (fils: number) => formatAED(fils, { decimals: 0 });

export default async function CenterDetailPage({ params }: { params: { id: string } }) {
  const data = await masterFetchSafe<CenterDetail>(`/centers/${params.id}`, FALLBACK);
  const c = data.center;

  return (
    <div className="flex flex-col gap-6">
      <Link href={"/master/centers" as Route} className="font-inter text-[12px] text-th-text-tertiary hover:text-th-text">
        ← All centers
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-semibold text-th-text">{c.name}</h1>
        <div className="font-inter text-[13px] text-th-text-tertiary">
          {c.address} · {c.city}
        </div>
        <div className="flex gap-2 text-[11px]">
          {c.archivedAt && <span className="text-[#E74C3C] border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-2 py-0.5 rounded uppercase font-bold">Archived</span>}
          {c.isSuspended && <span className="text-[#E74C3C] border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-2 py-0.5 rounded uppercase font-bold">Suspended</span>}
          {c.isFeatured && <span className="text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 rounded uppercase font-bold">Featured</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Hours" value={`${c.hoursOpen} – ${c.hoursClose}`} />
        <Stat label="Price range" value={`${aed(c.priceMin * 100)} – ${aed(c.priceMax * 100)}`} />
        <Stat label="Rating" value={c.rating?.toFixed(1) ?? "—"} />
        <Stat label="Tables" value={c.tables.length} />
        <Stat label="Staff" value={c.staff.length} />
        <Stat label="Created" value={formatDate(c.createdAt)} />
      </div>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">Staff</h2>
        <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
          {c.staff.length === 0 ? (
            <div className="p-6 text-center font-inter text-[13px] text-th-text-tertiary">No staff assigned.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-th-bg border-b border-th-border">
                <tr>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Name</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Phone</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Role</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Joined</th>
                </tr>
              </thead>
              <tbody>
                {c.staff.map((s) => (
                  <tr key={s.id} className="border-b border-th-card last:border-b-0">
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text">{s.user.displayName}</td>
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text-tertiary">{s.user.phone}</td>
                    <td className="px-4 py-3 font-inter text-[12px] text-th-text uppercase">{s.role}</td>
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text-tertiary">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">Recent Bookings (50)</h2>
        <div className="bg-th-card rounded-xl border border-th-border overflow-hidden">
          {data.recentBookings.length === 0 ? (
            <div className="p-6 text-center font-inter text-[13px] text-th-text-tertiary">No bookings yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-th-bg border-b border-th-border">
                <tr>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">When</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">Host</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">State</th>
                  <th className="px-4 py-3 font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-th-card last:border-b-0">
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text">{formatDateTime(b.startsAt)}</td>
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text">{b.host.displayName}</td>
                    <td className="px-4 py-3 font-inter text-[12px] text-th-text uppercase">{b.state}</td>
                    <td className="px-4 py-3 font-inter text-[13px] text-th-text text-right">{b.payment ? aed(b.payment.amount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-th-card rounded-xl p-4 border border-th-border">
      <div className="font-inter text-[10px] uppercase tracking-[0.12em] text-th-text-tertiary">{label}</div>
      <div className="font-mono text-[18px] font-bold text-th-text mt-1">{value}</div>
    </div>
  );
}
