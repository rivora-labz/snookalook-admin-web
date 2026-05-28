import MasterShell from "../../components/master/MasterShell";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MasterShell>{children}</MasterShell>;
}
