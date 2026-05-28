"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
// FOUNDER is the only role that reaches /master/* (enforced in middleware). They
// have no center-scoped row, so a "Back to Center Admin" link would dead-end at
// /dashboard → /forbidden. No back-link is the correct UX for god view.
import {
  ChartLineUp,
  Buildings,
  EnvelopeSimple,
  Megaphone,
  Briefcase,
  Hourglass,
  ClipboardText,
  GitBranch,
} from "phosphor-react";

const ITEMS = [
  { href: "/master/overview", label: "Overview", icon: ChartLineUp },
  { href: "/master/centers", label: "Centers", icon: Buildings },
  { href: "/master/leads", label: "Leads", icon: Megaphone },
  { href: "/master/newsletter", label: "Newsletter", icon: EnvelopeSimple },
  { href: "/master/careers", label: "Careers", icon: Briefcase },
  { href: "/master/waitlist", label: "Waitlist", icon: Hourglass },
  { href: "/master/audit", label: "Audit Log", icon: ClipboardText },
  { href: "/master/versions", label: "Versions", icon: GitBranch },
] as const;

export default function MasterNav() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] flex-shrink-0 bg-th-bg border-r border-th-card flex flex-col h-full">
      <div className="p-6 border-b border-th-card">
        <div className="flex items-center gap-2">
          <span className="font-display text-[18px] font-semibold text-th-text tracking-tight">
            Snook A Look
          </span>
        </div>
        <span className="mt-2 inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/10 rounded px-2 py-0.5">
          God View
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href as Route}
              className={`flex items-center gap-3 px-6 h-[40px] font-inter text-[13px] transition-colors ${
                active
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37]"
                  : "text-th-text-tertiary hover:text-th-text hover:bg-th-card"
              }`}
            >
              <Icon size={16} weight={active ? "fill" : "regular"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
