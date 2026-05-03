"use client";

import { useEffect, useState, useCallback } from "react";
import type { TableStatus, TableType } from "@rivora-labz/snook-shared";
import { apiFetch } from "../lib/api";
import { useRealtimeTables } from "../hooks/useRealtimeTables";

interface TableItem {
  id: string;
  tableNumber: number;
  type: TableType;
  hourlyRate: number;
  status: TableStatus;
  currentSessionStartedAt: string | null;
  currentBooking: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    startAt: string;
    endAt: string;
  } | null;
}

const STATUS_DOT: Record<TableStatus, string> = {
  AVAILABLE: "bg-[#2ECC71]",
  IN_PLAY: "bg-[#E74C3C]",
  RESERVED: "bg-[#F39C12]",
  MAINTENANCE: "bg-[#6B6B6B]",
};

const STATUS_TEXT: Record<TableStatus, string> = {
  AVAILABLE: "text-[#2ECC71]",
  IN_PLAY: "text-[#E74C3C]",
  RESERVED: "text-[#F39C12]",
  MAINTENANCE: "text-[#6B6B6B]",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Available",
  IN_PLAY: "In Play",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-card border border-th-divider bg-th-card p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 h-3 w-12 rounded bg-th-divider" />
              <div className="h-8 w-8 rounded bg-th-divider" />
            </div>
            <div className="h-4 w-16 rounded bg-th-divider" />
          </div>
          <div className="mt-4 h-3 w-20 rounded bg-th-divider" />
        </div>
      ))}
    </div>
  );
}

export function TablesGrid() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: TableItem[] }>("/admin/tables");
      setTables(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    apiFetch<{ staffMember: { centerId: string } }>("/staff/me")
      .then((r) => setCenterId(r.staffMember.centerId))
      .catch(() => {});
  }, [fetchTables]);

  useRealtimeTables(centerId, fetchTables);

  // Polling fallback. Runs alongside WS — cheap, harmless dedup. Drives
  // freshness in dev mode (no WS) and bridges any reconnect gaps.
  useEffect(() => {
    const id = setInterval(fetchTables, 30_000);
    return () => clearInterval(id);
  }, [fetchTables]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
        <p className="text-[#E74C3C]">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchTables(); }}
          className="mt-4 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-card border border-th-divider bg-th-card p-8 text-center text-th-text-secondary">
        No tables found. Seed the database with{" "}
        <code className="font-mono text-th-text">pnpm db:seed</code>.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {tables.map((t) => (
        <div
          key={t.id}
          className="rounded-card border border-th-divider bg-th-card p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-th-text-secondary">Table</div>
              <div className="font-mono text-2xl text-th-text">{t.tableNumber}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[t.status]}`} />
              <span className={`text-xs font-medium ${STATUS_TEXT[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-th-text-secondary">{t.type}</div>
          {t.currentBooking && (
            <div className="mt-2 rounded-button bg-th-bg px-2 py-1.5 text-xs">
              <span className="text-th-text-secondary">Playing:</span>{" "}
              <span className="text-th-text">{t.currentBooking.host.displayName}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
