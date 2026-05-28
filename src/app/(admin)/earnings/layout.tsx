import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Edge runtime: Node-Lambda SSR egress is blocked by Cloudflare BFM on the
// backend, false-positive redirecting authenticated owners to /forbidden.
export const runtime = "edge";

export default async function EarningsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role === "STAFF") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
