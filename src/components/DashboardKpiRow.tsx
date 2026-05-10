"use client";

import dynamic from "next/dynamic";
import { useTheme } from "../lib/ThemeContext";
import { ArrowUpRight, SquaresFour, Calendar, Users, ChartLineUp, ArrowsClockwise } from "phosphor-react";
import { Skeleton } from "./Skeleton";

const SparklineArea = dynamic(() => import("./charts/SparklineArea"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});

interface KpiData {
  title: string;
  value: string;
  trend: string;
  trendColor: string;
  icon: any;
  showSparkline?: boolean;
  showDonut?: boolean;
  showArrow?: boolean;
}

const mockSparkline = [
  { val: 10 }, { val: 25 }, { val: 15 }, { val: 35 }, { val: 30 }, { val: 50 }, { val: 40 }
];

export default function DashboardKpiRow({
  kpis,
  loading,
  error,
  onRetry,
}: {
  kpis: any;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const { isDark } = useTheme();

  if (error && !loading) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[#E74C3C]/40 bg-th-card p-6 flex items-center justify-between"
      >
        <div>
          <h3 className="font-display text-[14px] font-semibold text-[#E74C3C] mb-1">
            Failed to load KPIs
          </h3>
          <p className="font-inter text-[12px] text-th-text-tertiary">
            Backend unreachable. Tap retry or wait for the next 30s refresh.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Retry loading KPIs"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#F7D774] text-black font-display text-[13px] font-semibold px-4 py-2 transition-colors"
          >
            <ArrowsClockwise size={14} weight="bold" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-4 gap-4" aria-busy="true" aria-label="Loading KPIs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-th-card rounded-2xl p-6 border border-th-divider"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-7 w-32 mb-3" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    );
  }

  const data: KpiData[] = [
    { 
      title: "REVENUE TODAY", 
      value: kpis?.revenueToday || "AED 0", 
      trend: "▲ 12% vs yesterday", 
      trendColor: "text-[#2ECC71]",
      icon: ChartLineUp,
      showSparkline: true 
    },
    { 
      title: "TABLES IN USE", 
      value: kpis?.tablesInUse || "0 / 0", 
      trend: "0% utilization", 
      trendColor: "text-th-gold",
      icon: SquaresFour,
      showDonut: true 
    },
    { 
      title: "ACTIVE BOOKINGS", 
      value: kpis?.activeBookings || "0", 
      trend: "0 upcoming today", 
      trendColor: "text-th-text-secondary",
      icon: Calendar 
    },
    { 
      title: "NEW PLAYERS", 
      value: kpis?.newPlayersThisWeek || "0", 
      trend: "this week", 
      trendColor: "text-[#2ECC71]",
      icon: Users,
      showArrow: true 
    },
  ];

  return (
    <div className={`grid grid-cols-4 gap-4 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
          </linearGradient>
        </defs>
      </svg>

      {data.map((kpi, i) => (
        <div key={kpi.title} className="bg-th-card rounded-2xl p-6 border border-th-divider hover:border-th-border-medium transition-all relative overflow-hidden group">
          <span className="font-inter text-[11px] uppercase tracking-wider text-th-text-tertiary font-bold block mb-2">{kpi.title}</span>
          <div className="font-display text-[28px] font-bold text-th-text leading-none mb-3">{kpi.value}</div>
          
          <div className={`font-inter text-[12px] font-medium flex items-center gap-1 ${kpi.trendColor}`}>
            {kpi.trend}
          </div>

          {/* Sparkline Decorator */}
          {kpi.showSparkline && (
            <div className="absolute bottom-2 right-2 w-[80px] h-[40px] opacity-70 group-hover:opacity-100 transition-opacity">
              <SparklineArea data={mockSparkline} />
            </div>
          )}

          {/* Donut Decorator */}
          {kpi.showDonut && (
            <div className="absolute top-6 right-6 w-[56px] h-[56px] flex items-center justify-center">
              <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="var(--th-divider)" strokeWidth="4" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={(2 * Math.PI * 24) * (1 - 0.79)} />
              </svg>
              <span className="font-display text-[14px] font-bold text-th-text relative z-10 leading-none">79%</span>
            </div>
          )}

          {/* Arrow Decorator */}
          {kpi.showArrow && (
            <div className="absolute top-6 right-6 text-[#2ECC71]">
              <ArrowUpRight size={24} weight="bold" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
