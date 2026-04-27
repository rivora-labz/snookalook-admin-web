import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Snook A Look — Center Admin",
  description: "Operations dashboard for snooker, pool, and billiards centers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <div className="flex min-h-screen">
          <nav className="w-56 border-r border-white/5 bg-bg-secondary p-4">
            <div className="mb-8 font-display text-xl">Snook A Look</div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a
                  href="/"
                  className="block rounded-button px-3 py-2 hover:bg-white/5 hover:text-text-primary"
                >
                  Tables
                </a>
              </li>
              <li>
                <a
                  href="/bookings"
                  className="block rounded-button px-3 py-2 hover:bg-white/5 hover:text-text-primary"
                >
                  Bookings
                </a>
              </li>
              <li>
                <a
                  href="/earnings"
                  className="block rounded-button px-3 py-2 hover:bg-white/5 hover:text-text-primary"
                >
                  Earnings
                </a>
              </li>
            </ul>
          </nav>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
