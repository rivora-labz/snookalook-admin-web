// Public marketing layout. No admin sidebar, no auth.
// Forces dark theme regardless of admin theme cookie.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0A0A0A] text-white">{children}</div>;
}
