"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/bookings", label: "Calendar" },
  { href: "/bookings/history", label: "History" },
] as const;

export default function BookingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 bg-th-card border border-th-divider rounded-lg p-1">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              active
                ? "bg-th-elevated text-th-text shadow"
                : "text-th-text-tertiary hover:text-th-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
