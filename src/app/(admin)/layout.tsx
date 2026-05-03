import AdminNav from "../../components/AdminNav";


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-th-bg">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(52,152,219,0.06),transparent_24%)]" />
      <div className="flex min-h-screen">
      <AdminNav />
        <main className="relative ml-64 flex-1 px-8 py-8">
          <div className="mx-auto max-w-[1460px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
