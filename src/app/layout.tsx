import type { Metadata } from "next";
import "../styles/globals.css";
import { ThemeProvider } from "../lib/ThemeContext";

export const metadata: Metadata = {
  title: "Snook A Look — Center Admin",
  description: "Operations dashboard for snooker, pool, and billiards centers.",
};

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('snook-admin-theme')||'dark';document.documentElement.classList.add(t==='dark'?'theme-dark':'theme-light');}catch(e){document.documentElement.classList.add('theme-dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-th-bg text-th-text">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
