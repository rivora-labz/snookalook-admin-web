import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MasterNav from "./MasterNav";
import { getServerSession } from "../../lib/auth";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "../../lib/runtime-auth";

async function logoutAction() {
  "use server";
  const store = await cookies();
  store.delete(ADMIN_ACCESS_TOKEN_COOKIE);
  redirect("/login");
}

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
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-inter text-[12px] text-th-text-tertiary hover:text-th-text"
              >
                Logout
              </button>
            </form>
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
