import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Whole-route gate: /onboarding-hub flow PATCHes /admin/centers/me (OWNER+MANAGER).
// STAFF has no onboarding role — redirect to /forbidden.
// Edge runtime: Node-Lambda SSR egress is blocked by Cloudflare BFM on the
// backend, false-positive redirecting authenticated owners to /forbidden.
export const runtime = "edge";

export default async function OnboardingHubLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role === "STAFF") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
