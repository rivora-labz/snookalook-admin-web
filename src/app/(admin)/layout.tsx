import AdminShell from "../../components/AdminShell";

// Live admin data (bookings, KPIs, players, etc.) must never be statically
// cached. Propagates to every (admin)/* route that lacks its own directive.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
