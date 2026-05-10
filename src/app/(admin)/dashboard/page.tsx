"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetchRetry } from "../../../lib/api";
import { useAdmin } from "../../../lib/AdminContext";
import DashboardKpiRow from "../../../components/DashboardKpiRow";
import LiveTableStatus from "../../../components/LiveTableStatus";
import SchedulePanel from "../../../components/SchedulePanel";
import ActivityStrip from "../../../components/ActivityStrip";

interface DashboardKpis {
  tablesInUse: string;
  activeBookings: string;
  revenueToday: string;
  newPlayersThisWeek: string;
}

export default function DashboardPage() {
  const { dateRange } = useAdmin();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchKpis = useCallback(async () => {
    setError(false);
    try {
      const data = await apiFetchRetry<DashboardKpis>("/admin/dashboard/kpis", undefined, { retries: 2 });
      setKpis(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const retryKpis = useCallback(() => {
    setLoading(true);
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    fetchKpis();
    const id = setInterval(fetchKpis, 30_000);
    return () => clearInterval(id);
  }, [fetchKpis]);

  useEffect(() => {
    if (dateRange) {
      setIsRefreshing(true);
      const t = setTimeout(() => setIsRefreshing(false), 300);
      return () => clearTimeout(t);
    }
  }, [dateRange]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Row 1 — KPI Cards */}
      <div
        className={`transition-opacity duration-300 ${
          isRefreshing ? "opacity-50" : "opacity-100"
        }`}
      >
        <DashboardKpiRow kpis={kpis} loading={loading} error={error} onRetry={retryKpis} />
      </div>

      {/* Row 2 — Live Tables + Schedule */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <LiveTableStatus />
        </div>
        <div className="col-span-1">
          <SchedulePanel />
        </div>
      </div>

      {/* Row 3 — Recent Activity */}
      <ActivityStrip />
    </div>
  );
}
