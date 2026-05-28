import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Waitlist viewer is OWNER-only (backend also enforces requireAdmin("OWNER")).
// Edge runtime: Node-Lambda SSR egress is blocked by Cloudflare BFM on the
// backend, false-positive redirecting authenticated owners to /forbidden.
export const runtime = "edge";

export default async function WaitlistLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role !== "OWNER") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
