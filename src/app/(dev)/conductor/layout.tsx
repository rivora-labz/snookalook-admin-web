import { notFound } from "next/navigation";
import { isDevLocalhost } from "../../../lib/conductor/gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Conductor dashboard. DEV ONLY. NO admin auth applied (route lives outside (admin)
// group). Localhost gate is the only gate. Belt+suspenders: NODE_ENV check AND
// x-forwarded-for / host check. Production builds always return 404.
export default async function ConductorLayout({ children }: { children: React.ReactNode }) {
  if (!(await isDevLocalhost())) notFound();
  return <div className="min-h-screen bg-th-bg p-6 text-th-text">{children}</div>;
}
