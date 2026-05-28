import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Whole-route gate: /team is OWNER + MANAGER only. STAFF redirected to
// /forbidden rather than reaching the page and seeing button-hide / 403 banners.
// Per-button OWNER-only gates (Add Staff, Remove) live inside the page.
// Edge runtime: Node-Lambda SSR egress is blocked by Cloudflare BFM on the
// backend, false-positive redirecting authenticated owners to /forbidden.
export const runtime = "edge";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role === "STAFF") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
