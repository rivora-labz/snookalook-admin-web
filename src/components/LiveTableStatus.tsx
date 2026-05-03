"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Wrench, Clock } from "phosphor-react";
import { apiFetch, ApiError } from "../lib/api";
import { useRealtimeTables } from "../hooks/useRealtimeTables";
import { useActiveCenterId } from "../lib/active-center";

interface TableItem {
  id: string;
  tableNumber: number;
  type: string;
  status: "AVAILABLE" | "IN_PLAY" | "RESERVED" | "MAINTENANCE";
  currentBooking?: {
    id: string;
    host: { displayName: string; avatarUrl: string | null };
    endAt: string;
  } | null;
}

export default function LiveTableStatus() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const activeCenterId = useActiveCenterId();
  const abortRef = useRef<AbortController | null>(null);

  const fetchTables = useCallback(async (signal: AbortSignal) => {
    try {
      const data = await apiFetch<{ items: TableItem[] }>("/admin/tables", { signal });
      if (signal.aborted) return;
      setTables(data.items);
    } catch (err) {
      console.error("Failed to fetch tables", err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const kickFetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchTables(controller.signal);
  }, [fetchTables]);

  useEffect(() => {
    kickFetch();
    const id = setInterval(kickFetch, 30_000);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [kickFetch]);

  useRealtimeTables(activeCenterId, kickFetch);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-[140px] bg-th-card border border-th-divider rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-th-card rounded-2xl p-6 border border-th-divider">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[16px] font-bold text-th-text">Live Table Status</h2>
        <div className="flex items-center gap-4 text-[11px] font-inter font-bold uppercase tracking-wider text-th-text-tertiary">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2ECC71]"></span> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span> In Use</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-[#3498DB]"></span> Reserved</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#404040]"></span> Maint.</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {tables.map((t) => {
          const isInUse = t.status === "IN_PLAY";
          const isReserved = t.status === "RESERVED";
          const isMaintenance = t.status === "MAINTENANCE";
          const isAvailable = t.status === "AVAILABLE";

          const end = t.currentBooking ? new Date(t.currentBooking.endAt).getTime() : 0;
          const minsRemaining = Math.max(0, Math.round((end - now) / 60000));

          return (
            <Link 
              key={t.id}
              href={`/tables/${t.id}` as Route}
              className={`h-[140px] rounded-xl p-4 flex flex-col relative transition-all group hover:scale-[1.02] border ${
                isInUse 
                  ? 'bg-gradient-to-br from-[#0B3D2E] to-[#0A2016] border-th-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                  : isReserved
                  ? 'bg-th-elevated border-[#3498DB]/40'
                  : isMaintenance
                  ? 'bg-th-elevated border-th-divider grayscale opacity-60'
                  : 'bg-th-elevated border-th-divider hover:border-th-border-medium'
              }`}
            >
              <div className="absolute top-3 right-3">
                {isAvailable && <div className="w-2 h-2 rounded-full bg-[#2ECC71]"></div>}
                {isInUse && <div className="w-2 h-2 rounded-full bg-th-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>}
                {isMaintenance && <Wrench size={14} className="text-th-text-tertiary" />}
              </div>

              <div className="font-display text-[14px] font-bold text-th-text">Table {t.tableNumber.toString().padStart(2, '0')}</div>
              <div className="font-inter text-[11px] font-medium text-th-text-tertiary mt-0.5">{t.type}</div>

              <div className="mt-auto">
                {isInUse && (
                  <>
                    <div className="font-inter text-[12px] font-semibold text-th-text-secondary truncate">{t.currentBooking?.host.displayName}</div>
                    <div className="font-mono text-[12px] font-bold text-th-gold mt-1 flex items-center gap-1.5">
                      <Clock size={12} weight="bold" />
                      {minsRemaining}m remaining
                    </div>
                  </>
                )}
                {isReserved && (
                  <div className="font-inter text-[11px] text-[#3498DB] font-bold bg-[#3498DB]/10 inline-block px-2 py-0.5 rounded mt-1 uppercase tracking-wider">
                    RESERVED
                  </div>
                )}
                {isAvailable && (
                  <div className="font-inter text-[12px] font-bold text-[#2ECC71] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Book Now →
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
