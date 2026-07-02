"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { TableStatus, TableType } from "@rivora-labz/snook-shared";
import {
  GridFour,
  List,
  SortAscending,
  PencilSimple,
  CalendarX,
  CalendarCheck,
  ClockCounterClockwise,
  Plus,
} from "phosphor-react";
import { toast, Toaster } from "sonner";
import { apiFetch, formatAED } from "../../../lib/api";
import { formatTime } from "../../../lib/datetime";
import { useFocusTrap } from "../../../lib/use-focus-trap";
import AddTableModal from "../../../components/AddTableModal";
import EditTableModal, { type EditableTable } from "../../../components/EditTableModal";
import PlayerAvatar from "../../../components/PlayerAvatar";

interface TableItem {
  id: string;
  tableNumber: number;
  type: TableType;
  hourlyRate: number;
  pricePerHourFils?: number | null;
  status: TableStatus;
  todayRevenue?: number;
  utilization?: number;
  currentBooking?: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    startAt: string;
    endAt: string;
  } | null;
}

const STATUS_BADGE: Record<TableStatus, string> = {
  AVAILABLE: "bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30",
  IN_PLAY: "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
  RESERVED: "bg-[#3498DB]/20 text-[#3498DB] border-[#3498DB]/30",
  MAINTENANCE: "bg-[#404040] text-th-text-secondary border-[#808080]/30",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Available",
  IN_PLAY: "In Use",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

type TabFilter = "ALL" | TableStatus;

const TABS: { key: TabFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "AVAILABLE", label: "Available" },
  { key: "IN_PLAY", label: "In Use" },
  { key: "RESERVED", label: "Reserved" },
  { key: "MAINTENANCE", label: "Maintenance" },
];

function TableIllustration({ status }: { status: TableStatus }) {
  const inUse = status === "IN_PLAY";
  return (
    <div
      className={`h-[100px] w-full rounded-xl flex items-center justify-center border ${
        inUse
          ? "bg-gradient-to-b from-[#0B3D2E] to-[#0A2016] border-[#0A3D2E]"
          : "bg-gradient-to-b from-th-card to-th-bg border-th-divider"
      }`}
    >
      <div className="relative w-[180px] h-[70px] border border-[#2ECC71]/40 rounded bg-[#0A2A1A]/50">
        {/* Pocket dots */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-th-text-muted" />
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-th-text-muted" />
        <span className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full bg-th-text-muted" />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-th-text-muted" />
        <span className="absolute top-0.5 left-[calc(50%-4px)] w-2 h-2 rounded-full bg-th-text-muted" />
        <span className="absolute bottom-0.5 left-[calc(50%-4px)] w-2 h-2 rounded-full bg-th-text-muted" />
        {/* Ball dots — only when In Use */}
        {inUse && (
          <>
            <span className="absolute top-[18px] left-[60px] w-2 h-2 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
            <span className="absolute top-[30px] left-[90px] w-2 h-2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
            <span className="absolute top-[40px] left-[50px] w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
            <span className="absolute top-[20px] left-[110px] w-2 h-2 rounded-full bg-black shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block confirm dialog
// ---------------------------------------------------------------------------

interface BlockTarget {
  id: string;
  tableNumber: number;
  currentStatus: TableStatus;
}

function BlockConfirmDialog({
  target,
  isInflight,
  onConfirm,
  onCancel,
}: {
  target: BlockTarget | null;
  isInflight: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(target !== null, () => {
    if (!isInflight) onCancel();
  });
  if (!target) return null;
  const toBlock = target.currentStatus !== "MAINTENANCE";
  const num = target.tableNumber.toString().padStart(2, "0");
  const title = toBlock
    ? `Block Table ${num} for maintenance?`
    : `Unblock Table ${num}?`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="block-dialog-title"
      onClick={() => !isInflight && onCancel()}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-[14px] border border-th-divider bg-th-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="block-dialog-title"
          className="font-display text-[16px] font-semibold text-th-text"
        >
          {title}
        </h3>
        <p className="mt-2 font-inter text-[13px] text-th-text-tertiary">
          {toBlock
            ? "This will immediately prevent new bookings on this table."
            : "This will make the table available for new bookings."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isInflight}
            className="h-[36px] px-4 rounded-lg font-inter text-[13px] text-th-text-tertiary hover:text-th-text hover:bg-th-hover border border-th-divider disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isInflight}
            aria-busy={isInflight}
            className={`h-[36px] px-5 rounded-lg font-inter text-[13px] font-semibold disabled:opacity-50 transition-colors ${
              toBlock
                ? "bg-[#E74C3C] hover:opacity-90 text-white"
                : "bg-[#0B3D2E] border border-[#D4AF37] hover:bg-[#0B3D2E]/80 text-th-text"
            }`}
          >
            {isInflight
              ? toBlock ? "Blocking…" : "Unblocking…"
              : toBlock ? "Block" : "Unblock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TablesIndexClient() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableTable | null>(null);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: TableItem[] }>("/admin/tables");
      setTables(data.items);
    } catch {
      // keep stale data on refresh failures
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    const tick = () => { if (document.visibilityState === "visible") fetchTables(); };
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const handleBlockConfirm = useCallback(async () => {
    if (!blockTarget) return;
    const { id, currentStatus } = blockTarget;
    const newStatus: TableStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";

    // Optimistic update
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    setBlockingId(id);
    setBlockTarget(null);

    try {
      await apiFetch(`/admin/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err: unknown) {
      // Roll back
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: currentStatus } : t))
      );
      const msg =
        err instanceof Error ? err.message : "Failed to update table status";
      toast.error(msg);
    } finally {
      setBlockingId(null);
    }
  }, [blockTarget]);

  const counts = useMemo(() => {
    const c: Record<TabFilter, number> = {
      ALL: tables.length,
      AVAILABLE: 0,
      IN_PLAY: 0,
      RESERVED: 0,
      MAINTENANCE: 0,
    };
    tables.forEach((t) => {
      c[t.status] = (c[t.status] ?? 0) + 1;
    });
    return c;
  }, [tables]);

  const filtered = useMemo(
    () => (tab === "ALL" ? tables : tables.filter((t) => t.status === tab)),
    [tables, tab]
  );

  return (
    <div className="flex flex-col h-full bg-th-bg -m-8 pb-12">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 flex items-center justify-between">
        <h1 className="font-display text-[24px] font-semibold text-th-text">Tables</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex h-[40px] items-center gap-2 rounded-lg bg-[#D4AF37] px-5 font-display text-[14px] font-semibold text-black shadow-gold-glow hover:bg-[#F7D774] transition-colors"
        >
          <Plus size={16} />
          Add Table
        </button>
      </div>

      {/* Sticky filter tab bar */}
      <div className="sticky top-0 z-20 h-[56px] bg-th-elevated border-y border-th-divider flex items-center justify-between px-8">
        <div className="flex items-center h-full">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`h-full px-4 font-inter text-[13px] font-medium transition-colors border-b-2 ${
                tab === key
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-th-text-tertiary hover:text-th-text"
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-th-text-tertiary hover:text-th-text font-inter text-[13px] bg-th-card px-3 py-1.5 rounded-md border border-th-divider transition-colors">
            <SortAscending size={16} />
            Sort
          </button>
          <div className="flex bg-th-card rounded-md border border-th-divider p-1 gap-1">
            <button aria-label="Grid view" className="p-1.5 rounded bg-th-divider text-th-text shadow-sm">
              <GridFour size={16} />
            </button>
            <button aria-label="List view" className="p-1.5 rounded text-th-text-tertiary hover:text-th-text transition-colors">
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[360px] animate-pulse rounded-[20px] border border-th-divider bg-th-card"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filtered.map((t) => {
              const revenue = t.todayRevenue ?? t.hourlyRate ?? 0;
              const utilization = t.utilization ?? 0;
              const booking = t.currentBooking ?? null;
              const showPlayerRow = t.status === "IN_PLAY" || t.status === "RESERVED";

              return (
                <div
                  key={t.id}
                  className="h-[360px] bg-th-card rounded-[20px] p-5 flex flex-col border border-th-divider hover:border-[var(--th-border-medium)] hover:-translate-y-1 transition-all shadow-glass relative group"
                >
                  {/* Status badge */}
                  <div
                    className={`w-full py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider text-center border mb-4 ${STATUS_BADGE[t.status]}`}
                  >
                    {STATUS_LABEL[t.status]}
                  </div>

                  {/* Table illustration */}
                  <TableIllustration status={t.status} />

                  {/* Name + type */}
                  <div className="mt-4">
                    <h2 className="font-display text-[18px] font-semibold text-th-text">
                      Table {t.tableNumber.toString().padStart(2, "0")}
                    </h2>
                    <p className="font-inter text-[13px] text-th-text-tertiary">{t.type}</p>
                  </div>

                  {/* Revenue / Utilization row */}
                  <div className="mt-4 pt-4 border-t border-th-divider flex items-center justify-between">
                    <div>
                      <p className="font-inter text-[11px] text-th-text-tertiary">
                        Today&apos;s Revenue
                      </p>
                      <p className="font-mono text-[16px] font-semibold text-[#D4AF37]">
                        {formatAED(revenue)}
                      </p>
                    </div>
                    <div className="w-[1px] h-8 bg-th-divider" />
                    <div className="text-right">
                      <p className="font-inter text-[11px] text-th-text-tertiary">Utilization</p>
                      <p className="font-mono text-[16px] font-semibold text-th-text">
                        {utilization}%
                      </p>
                    </div>
                  </div>

                  {/* Current player row */}
                  {showPlayerRow && (
                    <div className="mt-3 flex items-center gap-2 bg-th-elevated p-2 rounded-lg border border-th-divider">
                      {t.status === "IN_PLAY" && booking && (
                        <PlayerAvatar
                          url={booking.host.avatarUrl ?? null}
                          name={booking.host.displayName}
                          size={24}
                        />
                      )}
                      <span className="font-inter text-[12px] text-th-text truncate">
                        {booking
                          ? `${booking.host.displayName} · Until ${formatTime(booking.endAt)}`
                          : "Reserved"}
                      </span>
                    </div>
                  )}

                  {/* Hover action buttons */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setEditTarget({
                          id: t.id,
                          tableNumber: t.tableNumber,
                          type: t.type as EditableTable["type"],
                          hourlyRate: t.hourlyRate,
                          pricePerHourFils: t.pricePerHourFils ?? null,
                        })
                      }
                      title="Edit"
                      aria-label="Edit table"
                      className="w-8 h-8 rounded-full bg-th-divider hover:bg-[var(--th-hover)] text-th-text flex items-center justify-center transition-colors"
                    >
                      <PencilSimple size={16} />
                    </button>
                    {(() => {
                      const isMaintenance = t.status === "MAINTENANCE";
                      const isInflight = blockingId === t.id;
                      const label = isMaintenance
                        ? `Unblock table ${t.tableNumber}`
                        : `Block table ${t.tableNumber}`;
                      return (
                        <button
                          onClick={() =>
                            !isInflight &&
                            setBlockTarget({
                              id: t.id,
                              tableNumber: t.tableNumber,
                              currentStatus: t.status,
                            })
                          }
                          title={isMaintenance ? "Unblock" : "Block"}
                          aria-label={label}
                          aria-busy={isInflight}
                          disabled={isInflight}
                          className="w-8 h-8 rounded-full bg-th-divider hover:bg-[var(--th-hover)] text-th-text flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          {isMaintenance ? (
                            <CalendarCheck size={16} />
                          ) : (
                            <CalendarX size={16} />
                          )}
                        </button>
                      );
                    })()}
                    <button
                      title="History"
                      aria-label="Table history"
                      className="w-8 h-8 rounded-full bg-th-divider hover:bg-[var(--th-hover)] text-th-text flex items-center justify-center transition-colors"
                    >
                      <ClockCounterClockwise size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddTableModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchTables} />
      <EditTableModal
        open={editTarget !== null}
        table={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchTables}
      />
      <BlockConfirmDialog
        target={blockTarget}
        isInflight={blockingId !== null}
        onConfirm={handleBlockConfirm}
        onCancel={() => setBlockTarget(null)}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}
