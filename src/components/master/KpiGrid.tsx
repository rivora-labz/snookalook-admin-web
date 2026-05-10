interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "gold" | "green" | "red" | "blue" | "neutral";
}

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  gold: "border-l-[#D4AF37]",
  green: "border-l-[#2ECC71]",
  red: "border-l-[#E74C3C]",
  blue: "border-l-[#3498DB]",
  neutral: "border-l-th-border",
};

export function KpiCard({ label, value, sub, accent = "neutral" }: KpiCardProps) {
  return (
    <div className={`bg-th-card rounded-xl p-5 border-l-4 ${ACCENT[accent]} flex flex-col gap-1.5`}>
      <div className="font-inter text-[11px] uppercase tracking-[0.12em] text-th-text-tertiary">
        {label}
      </div>
      <div className="font-mono text-[26px] font-bold text-th-text leading-none">
        {value}
      </div>
      {sub && (
        <div className="font-inter text-[12px] text-th-text-tertiary">
          {sub}
        </div>
      )}
    </div>
  );
}

export default function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
