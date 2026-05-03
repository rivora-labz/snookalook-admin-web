"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { TableStatus, TableType } from "@rivora-labz/snook-shared";
import { 
  DotsThreeVertical, 
  TrendUp, 
  Wrench, 
  Clock, 
  ChartLine 
} from "phosphor-react";
import { apiFetch, formatAED } from "../../../lib/api";
import AddTableModal from "../../../components/AddTableModal";
import EditTableModal, { type EditableTable } from "../../../components/EditTableModal";
import { useStaffSession } from "../../../lib/use-staff-session";
import Button from "../../../components/Button";

interface TableItem {
  id: string;
  tableNumber: number;
  type: TableType;
  hourlyRate: number;
  pricePerHourFils?: number | null;
  status: TableStatus;
}

const STATUS_COLOR: Record<TableStatus, string> = {
  AVAILABLE: "#2ECC71",
  IN_PLAY: "#E74C3C",
  RESERVED: "#F39C12",
  MAINTENANCE: "#6B6B6B",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Available",
  IN_PLAY: "In Play",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

export default function TablesIndexClient() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableTable | null>(null);
  const [filter, setFilter] = useState<TableStatus | "ALL">("ALL");
  
  const { session } = useStaffSession();
  const canMutate = session?.role !== "STAFF";

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
    const interval = setInterval(fetchTables, 30_000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return tables;
    return tables.filter(t => t.status === filter);
  }, [tables, filter]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-[220px] bg-th-card border border-th-divider rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-th-card border border-th-divider p-1 rounded-xl">
          {["ALL", "AVAILABLE", "IN_PLAY", "MAINTENANCE"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                filter === f 
                  ? "bg-th-gold text-black shadow-md" 
                  : "text-th-text-tertiary hover:text-th-text"
              }`}
            >
              {f === "ALL" ? "All Tables" : STATUS_LABEL[f as TableStatus]}
            </button>
          ))}
        </div>
        
        {canMutate && (
          <Button onClick={() => setAddOpen(true)}>
            + Register New Table
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => {
          const price = t.pricePerHourFils ?? t.hourlyRate ?? 0;
          return (
            <div key={t.id} className="bg-th-card border border-th-divider rounded-2xl p-6 hover:border-th-border-medium transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-th-elevated border border-th-divider rounded-xl flex items-center justify-center font-display text-[20px] font-bold text-th-text group-hover:text-th-gold transition-colors">
                    {t.tableNumber.toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-th-text">{t.type}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[t.status] }} />
                      <span className="text-[11px] font-bold text-th-text-tertiary uppercase tracking-wider">{STATUS_LABEL[t.status]}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setEditTarget({
                    id: t.id,
                    tableNumber: t.tableNumber,
                    type: t.type as EditableTable["type"],
                    hourlyRate: t.hourlyRate,
                    pricePerHourFils: t.pricePerHourFils ?? null,
                  })}
                  className="p-2 text-th-text-tertiary hover:text-th-text hover:bg-th-hover rounded-lg transition-colors"
                >
                  <DotsThreeVertical size={20} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-th-elevated rounded-xl p-3 border border-th-divider">
                  <span className="text-[10px] font-bold text-th-text-tertiary uppercase tracking-widest block mb-1">Rate / Hour</span>
                  <span className="font-mono text-[14px] font-bold text-th-text">{formatAED(price)}</span>
                </div>
                <div className="bg-th-elevated rounded-xl p-3 border border-th-divider">
                  <span className="text-[10px] font-bold text-th-text-tertiary uppercase tracking-widest block mb-1">Utilization</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[14px] font-bold text-[#2ECC71]">84%</span>
                    <TrendUp size={14} className="text-[#2ECC71]" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 gap-2"
                  onClick={() => window.location.href = `/tables/${t.id}`}
                >
                  <ChartLine size={16} />
                  Analytics
                </Button>
                {t.status === "MAINTENANCE" ? (
                   <Button variant="ghost" size="sm" className="px-2">
                     <Wrench size={18} />
                   </Button>
                ) : (
                  <div className="p-2 text-th-text-tertiary group-hover:text-th-gold transition-colors">
                    <Clock size={18} />
                  </div>
                )}
              </div>
              
              {/* Subtle background glow for in-use tables */}
              {t.status === "IN_PLAY" && (
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-th-gold/5 blur-3xl rounded-full pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      <AddTableModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchTables} />
      <EditTableModal
        open={editTarget !== null}
        table={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchTables}
      />
    </div>
  );
}
