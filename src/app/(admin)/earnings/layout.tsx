import { redirect } from "next/navigation";
import { getServerSession } from "../../../lib/auth";

export default async function EarningsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.staff || session.staff.role === "STAFF") {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
