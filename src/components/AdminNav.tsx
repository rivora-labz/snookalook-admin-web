"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "dev";

const NAV_ITEMS = [
  { href: "/", label: "Tables", icon: GridIcon },
  { href: "/bookings", label: "Bookings", icon: CalendarIcon },
  { href: "/earnings", label: "Earnings", icon: ChartIcon },
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/players", label: "Players", icon: UsersIcon },
  { href: "/team", label: "Team", icon: PersonPlusIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-th-divider bg-th-elevated">
      <div className="flex items-start justify-between px-5 py-6">
        <div>
          <div className="font-display text-xl text-th-text">Snook A Look</div>
          <div className="mt-0.5 text-[10px] text-th-text-tertiary">Center Admin</div>
        </div>
        <ThemeToggle />
      </div>

      <ul className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-button px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-l-[3px] border-th-gold bg-th-gold-bg pl-[9px] font-medium text-th-gold"
                    : "text-th-text-secondary hover:bg-th-hover hover:text-th-text"
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-th-divider px-3 py-3">
        {AUTH_MODE === "supabase" && (
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="mb-2 flex w-full items-center gap-3 rounded-button px-3 py-2 text-xs text-th-text-secondary hover:bg-th-hover hover:text-th-text"
          >
            Sign out
          </button>
        )}
        <div className="px-3 text-[10px] text-th-text-tertiary">v0.1.0</div>
      </div>
    </nav>
  );
}

function GridIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke={c} strokeWidth="1.5" />
      <path d="M1.5 6.5h13" stroke={c} strokeWidth="1.5" />
      <path d="M5 1v3M11 1v3" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14V8M6 14V5M10 14V8M14 14V2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GaugeIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12a6 6 0 1 1 12 0" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12V7" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="12" r="1" fill={c} />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M1 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="1.5" stroke={c} strokeWidth="1.2" />
      <path d="M13 9.5c1.5.5 2.5 1.8 2.5 3.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PersonPlusIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="5" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M1.5 14c0-2.5 2.2-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 3v4M11 5h4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  const c = active ? "var(--th-gold)" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.5" />
      <path
        d="M8 1.5l.7 1.8a4.5 4.5 0 0 1 1.6.9l1.9-.4.8 1.4-1.2 1.4c.1.3.1.6.1.9s0 .6-.1.9l1.2 1.4-.8 1.4-1.9-.4a4.5 4.5 0 0 1-1.6.9L8 14.5l-.7-1.8a4.5 4.5 0 0 1-1.6-.9l-1.9.4-.8-1.4 1.2-1.4c-.1-.3-.1-.6-.1-.9s0-.6.1-.9L3 6.2l.8-1.4 1.9.4a4.5 4.5 0 0 1 1.6-.9L8 1.5z"
        stroke={c}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
