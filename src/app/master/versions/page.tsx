import { masterFetchSafe } from "../../../lib/master-api";
import { formatDate, formatDateTime } from "../../../lib/datetime";

export const dynamic = "force-dynamic";

interface MobileRelease {
  id: string;
  platform: string;
  versionName: string;
  versionCode: number;
  isMinimumSupported: boolean;
  releasedAt: string;
  notes: string | null;
}

interface Versions {
  backend: {
    version: string;
    gitSha: string | null;
    startedAt: string;
    nodeVersion: string;
  };
  mobile: {
    android: { latest: MobileRelease | null; minimumSupported: MobileRelease | null };
    ios: { latest: MobileRelease | null; minimumSupported: MobileRelease | null };
  };
}

const FALLBACK: Versions = {
  backend: { version: "unknown", gitSha: null, startedAt: new Date().toISOString(), nodeVersion: "unknown" },
  mobile: {
    android: { latest: null, minimumSupported: null },
    ios: { latest: null, minimumSupported: null },
  },
};

async function getAdminWebMeta(): Promise<{ gitSha: string | null; gitRef: string | null; deployedAt: string }> {
  // Server component fetches its own /api/version route to surface Vercel build env.
  return {
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? new Date().toISOString(),
  };
}

export default async function VersionsPage() {
  const [data, adminWeb] = await Promise.all([
    masterFetchSafe<Versions>("/versions", FALLBACK),
    getAdminWebMeta(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold text-th-text">Versions</h1>
        <p className="font-inter text-[13px] text-th-text-tertiary mt-1">
          Live build identifiers across the Snook A Look stack.
        </p>
      </header>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceCard
            label="Backend (Fastify)"
            primary={data.backend.version}
            rows={[
              ["Git SHA", short(data.backend.gitSha)],
              ["Node", data.backend.nodeVersion],
              ["Started", formatDateTime(data.backend.startedAt)],
            ]}
          />
          <ServiceCard
            label="Admin Web (this app)"
            primary={short(adminWeb.gitSha) ?? "local"}
            rows={[
              ["Branch", adminWeb.gitRef ?? "—"],
              ["Deployed", formatDateTime(adminWeb.deployedAt)],
            ]}
          />
        </div>
      </section>

      <section>
        <h2 className="font-inter text-[12px] uppercase tracking-[0.18em] text-th-text-tertiary mb-3">Mobile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MobileCard label="Android" data={data.mobile.android} />
          <MobileCard label="iOS" data={data.mobile.ios} />
        </div>
      </section>
    </div>
  );
}

function short(sha: string | null | undefined): string | null {
  if (!sha) return null;
  return sha.slice(0, 7);
}

function ServiceCard({
  label,
  primary,
  rows,
}: {
  label: string;
  primary: string | null;
  rows: Array<[string, string | null]>;
}) {
  return (
    <div className="bg-th-card rounded-xl p-5 border border-th-border">
      <div className="font-inter text-[10px] uppercase tracking-[0.12em] text-th-text-tertiary">{label}</div>
      <div className="font-mono text-[20px] font-bold text-th-text mt-1">{primary ?? "—"}</div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 font-inter text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-th-text-tertiary">{k}</dt>
            <dd className="text-th-text font-mono text-[11px]">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MobileCard({
  label,
  data,
}: {
  label: string;
  data: { latest: MobileRelease | null; minimumSupported: MobileRelease | null };
}) {
  return (
    <div className="bg-th-card rounded-xl p-5 border border-th-border">
      <div className="font-inter text-[10px] uppercase tracking-[0.12em] text-th-text-tertiary">{label}</div>
      <div className="font-mono text-[20px] font-bold text-th-text mt-1">
        {data.latest ? `${data.latest.versionName} (${data.latest.versionCode})` : "—"}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 font-inter text-[12px]">
        <dt className="text-th-text-tertiary">Latest</dt>
        <dd className="text-th-text font-mono text-[11px]">
          {data.latest ? formatDate(data.latest.releasedAt) : "—"}
        </dd>
        <dt className="text-th-text-tertiary">Min supported</dt>
        <dd className="text-th-text font-mono text-[11px]">
          {data.minimumSupported
            ? `${data.minimumSupported.versionName} (${data.minimumSupported.versionCode})`
            : "—"}
        </dd>
      </dl>
    </div>
  );
}
