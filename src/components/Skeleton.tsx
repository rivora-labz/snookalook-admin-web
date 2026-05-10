"use client";

import type { CSSProperties } from "react";

const ROUNDED_MAP = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
} as const;

export function Skeleton({
  className = "",
  style,
  rounded = "md",
}: {
  className?: string;
  style?: CSSProperties;
  rounded?: keyof typeof ROUNDED_MAP;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy="true"
      className={`animate-pulse bg-th-divider ${ROUNDED_MAP[rounded]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading text" aria-busy="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-th-divider"
          style={{ width: `${100 - i * 8}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120, className = "" }: { height?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading card"
      aria-busy="true"
      className={`animate-pulse rounded-card bg-th-divider ${className}`}
      style={{ height }}
    />
  );
}
