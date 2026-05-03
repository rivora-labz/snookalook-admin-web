import Link from "next/link";
import type { Route } from "next";

export default function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: Route;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-th-divider bg-th-card p-5 transition-colors hover:border-th-gold/40 hover:bg-th-hover"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-base text-th-text">{title}</span>
        <span className="text-th-text-tertiary group-hover:text-th-gold">→</span>
      </div>
      <p className="mt-1.5 text-xs text-th-text-tertiary">{description}</p>
    </Link>
  );
}
