import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Edge runtime: Node-Lambda SSR egress IPs are blocked by Cloudflare Bot Fight
// Mode on the backend domain, so getServerSession() (which fetches /staff/me)
// returns null and the layout false-positive redirects authenticated owners to
// /forbidden. Edge runs from CF's own network and passes BFM.
export const runtime = "edge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role === "STAFF") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
