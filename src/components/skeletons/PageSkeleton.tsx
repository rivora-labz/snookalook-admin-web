export function SkBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-th-card rounded-lg ${className}`} />;
}

export function SkLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-th-card rounded ${className || "h-4 w-32"}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex flex-col gap-2">
        <SkLine className="h-7 w-48" />
        <SkLine className="h-4 w-72" />
      </div>
      <SkBox className="h-10 w-32" />
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-th-card bg-th-card/40 p-4 flex flex-col gap-3">
          <SkLine className="h-3 w-20" />
          <SkLine className="h-7 w-28" />
          <SkLine className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-th-card overflow-hidden">
      <div className="grid gap-4 p-4 border-b border-th-card bg-th-card/40" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <SkLine key={i} className="h-3 w-24" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 p-4 border-b border-th-card/40 last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => <SkLine key={c} className="h-4 w-full max-w-[180px]" />)}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-th-card bg-th-card/40 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SkLine className="h-5 w-32" />
            <SkBox className="h-6 w-16" />
          </div>
          <SkLine className="h-3 w-full" />
          <SkLine className="h-3 w-4/5" />
          <div className="mt-2 flex gap-2">
            <SkBox className="h-8 w-20" />
            <SkBox className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`rounded-xl border border-th-card bg-th-card/40 p-5 ${height} flex flex-col gap-3`}>
      <SkLine className="h-4 w-40" />
      <div className="flex-1 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse bg-th-card rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}
