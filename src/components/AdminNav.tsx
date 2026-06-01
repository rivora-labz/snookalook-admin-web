"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "../lib/supabase/client";
import { getRuntimeAuthMode } from "../lib/runtime-auth";
import { clearAdminAccessTokenCookie } from "../app/actions/admin-token";
import { useStaffSession } from "../lib/use-staff-session";
import {
  SquaresFour,
  GridFour,
  Calendar,
  Users,
  ChartLineUp,
  CreditCard,
  Gear,
  SignOut,
  Trophy,
} from "phosphor-react";

const AUTH_MODE = getRuntimeAuthMode();

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour, end: true },
  { href: "/", label: "Tables", icon: GridFour, end: true },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/players", label: "Players", icon: Users },
  { href: "/analytics", label: "Analytics", icon: ChartLineUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/earnings", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Gear },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { session } = useStaffSession();
  const centerName = session?.centerName ?? "Center";
  const operatorName = session?.userDisplayName ?? "Staff";
  const operatorRole = session?.role ?? "STAFF";

  return (
    <div className="w-[240px] flex-shrink-0 h-full border-r border-th-card bg-th-bg flex flex-col pt-6 pb-6">
      {/* Logo Lockup */}
      <div className="px-6 flex items-center gap-3 mb-8">
        <div className="w-[32px] h-[32px] rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-sm">
          8
        </div>
        <span className="font-display text-[16px] font-semibold text-th-text leading-none">
          Snook A Look
        </span>
        <div className="ml-auto bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Admin
        </div>
      </div>

      {/* Club Switcher */}
      <div className="px-6 mb-6">
        <button className="flex items-center justify-between w-full p-3 bg-th-card rounded-xl border border-th-border hover:bg-th-divider transition-colors">
          <span className="font-display text-[14px] font-medium text-th-text truncate">
            {centerName}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--th-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, end }) => {
          const active = end
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href as never}
              className={`flex items-center gap-3 px-4 h-[44px] rounded-lg transition-all relative overflow-hidden group ${
                active
                  ? "text-[#D4AF37]"
                  : "text-th-text-tertiary hover:text-th-text hover:bg-[var(--th-hover)]"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D4AF37] rounded-r shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
              )}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/10 to-transparent pointer-events-none" />
              )}
              <div
                className={`relative z-10 ${active ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : ""}`}
              >
                <Icon size={20} />
              </div>
              <span className="font-inter text-[14px] font-medium relative z-10">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile */}
      <div className="px-6 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-full overflow-hidden border border-th-border-medium">
            <Image
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              alt="Admin"
              width={40}
              height={40}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-inter text-[13px] font-medium text-th-text">
              {operatorName}
            </span>
            <span className="font-inter text-[11px] text-th-text-tertiary">
              {operatorRole}
            </span>
          </div>
        </div>
        {AUTH_MODE === "supabase" ? (
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-th-text-tertiary hover:text-th-text transition-colors"
            title="Sign out"
          >
            <SignOut size={20} />
          </button>
        ) : (
          <button
            onClick={async () => {
              await clearAdminAccessTokenCookie();
              window.location.href = "/login";
            }}
            className="text-th-text-tertiary hover:text-th-text transition-colors"
            title="Sign out"
          >
            <SignOut size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
