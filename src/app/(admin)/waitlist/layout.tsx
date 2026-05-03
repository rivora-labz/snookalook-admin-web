import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

// Waitlist viewer is OWNER-only (backend also enforces requireAdmin("OWNER")).
export default async function WaitlistLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role !== "OWNER") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
