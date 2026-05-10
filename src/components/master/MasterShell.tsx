import { Toaster } from "sonner";
import MasterNav from "./MasterNav";
import { getServerSession } from "../../lib/auth";

export default async function MasterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const founderName = session?.staff?.user.displayName ?? "Founder";

  return (
    <div className="flex h-full w-full bg-th-bg text-th-text overflow-hidden">
      <MasterNav />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-8 border-b border-th-card bg-th-bg">
          <div className="flex items-center gap-3">
            <span className="font-inter text-[12px] text-th-text-tertiary">
              Platform admin · all centers
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-inter text-[12px] text-th-text">
              {founderName}
            </span>
            <a
              href="/login"
              className="font-inter text-[12px] text-th-text-tertiary hover:text-th-text"
            >
              Logout
            </a>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-th-bg p-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
