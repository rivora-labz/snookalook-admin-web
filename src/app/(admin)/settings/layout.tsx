import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Whole-route gate: /settings PUT is OWNER-only on backend.
// MANAGER + STAFF redirected to /forbidden rather than reaching page and
// hitting per-section 403 on Save.
// Edge runtime: Node-Lambda SSR egress is blocked by Cloudflare BFM on the
// backend, false-positive redirecting authenticated owners to /forbidden.
export const runtime = "edge";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role !== "OWNER") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
