"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FunnelSimple,
  DownloadSimple,
  MagnifyingGlass,
  CaretDown,
  DotsThree,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  AppleLogo,
  GoogleLogo,
  Storefront,
  Money,
  Wallet,
  CreditCard,
  FilePdf,
} from "phosphor-react";
import { toast } from "sonner";
import { apiFetch, apiFetchBlob, formatAED } from "../../../lib/api";
import { formatDate, formatTime } from "../../../lib/datetime";
import PlayerAvatar from "../../../components/PlayerAvatar";
import Drawer from "../../../components/Drawer";

const SparklineArea = dynamic(() => import("../../../components/charts/SparklineArea"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});
const SparklineBar = dynamic(() => import("../../../components/charts/SparklineBar"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});
const SparklineLine = dynamic(() => import("../../../components/charts/SparklineLine"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
});

type TxnType = "Booking" | "Wallet Top-up" | "Membership" | "Refund";
type TxnStatus = "Completed" | "Pending" | "Refunded" | "Failed";

const TYPE_DOT: Record<TxnType, string> = {
  Booking: "#3498DB",
  "Wallet Top-up": "#9B59B6",
  Membership: "#D4AF37",
  Refund: "#E74C3C",
};

function TypePill({ type }: { type: TxnType }) {
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--th-hover)] border border-[var(--th-border)]">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: TYPE_DOT[type] ?? "#6B6B6B" }}
      />
      <span className="font-inter text-[12px] text-th-text">{type}</span>
    </span>
  );
}

const STATUS_STYLE: Record<TxnStatus, { dot: string; text: string }> = {
  Completed: { dot: "#2ECC71", text: "text-[#2ECC71]" },
  Pending: { dot: "#F39C12", text: "text-[#F39C12]" },
  Refunded: { dot: "#808080", text: "text-th-text-tertiary" },
  Failed: { dot: "#E74C3C", text: "text-[#E74C3C]" },
};

function StatusPill({ status }: { status: TxnStatus }) {
  const s = STATUS_STYLE[status] ?? { dot: "#6B6B6B", text: "text-th-text-tertiary" };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      <span className={`font-inter text-[12px] ${s.text}`}>{status}</span>
    </span>
  );
}

function MethodDisplay({ method }: { method: string }) {
  let Icon = CreditCard;
  if (method.includes("Apple")) Icon = AppleLogo;
  else if (method.includes("Google")) Icon = GoogleLogo;
  else if (method.includes("Tabby") || method.includes("Tamara")) Icon = Storefront;
  else if (method.includes("Cash")) Icon = Money;
  else if (method.includes("Wallet")) Icon = Wallet;
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-th-text-tertiary" />
      <span className="font-inter text-[13px] text-th-text">{method}</span>
    </div>
  );
}

interface Transaction {
  id: string;
  date: string;
  time: string;
  player: { id: string; name: string; email: string; avatarUrl?: string | null };
  type: TxnType;
  method: string;
  amount: string;
  amountFils: number;
  status: TxnStatus;
  bookingRef?: string;
}

interface EarningsKpi {
  revenueFils: number;
  transactions: number;
  avgFils: number;
  refundRatePct: number;
  revenueDeltaPct?: number;
  transactionsDeltaPct?: number;
  avgDeltaPct?: number;
  refundRateDeltaPct?: number;
}

interface SparkPoint {
  date: string;
  revenueFils: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  booking: {
    id: string;
    host: { id: string; displayName: string; avatarUrl: string | null };
    table: { tableNumber: number; type: string };
    startAt: string;
  };
}

function toTxnStatus(s: string): TxnStatus {
  if (s === "CAPTURED" || s === "AUTHORIZED") return "Completed";
  if (s === "PENDING") return "Pending";
  if (s === "REFUNDED") return "Refunded";
  return "Failed";
}

function toTransaction(p: PaymentItem): Transaction {
  return {
    id: p.id,
    date: formatDate(p.createdAt),
    time: formatTime(p.createdAt),
    player: {
      id: p.booking.host.id,
      name: p.booking.host.displayName,
      email: "",
      avatarUrl: p.booking.host.avatarUrl,
    },
    type: "Booking",
    method: p.method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    amount: p.amount < 0 ? `−${formatAED(Math.abs(p.amount))}` : formatAED(p.amount),
    amountFils: p.amount,
    status: toTxnStatus(p.status),
    bookingRef: p.booking.id.slice(0, 8).toUpperCase(),
  };
}

function groupByDate(txns: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  txns.forEach((t) => {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  });
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function formatDelta(pct: number | undefined): { text: string; isUp: boolean } | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const sign = pct >= 0 ? "+" : "";
  const display = (pct * 100).toFixed(1).replace(/\.0$/, "");
  return { text: `${sign}${display}%`, isUp: pct >= 0 };
}

const PAGE_SIZE = 12;
const COMING_SOON = "Coming soon";
const COMING_SOON_ACTIONS = "Coming soon — requires Tabby + Stripe webhook hookup";

export default function EarningsPage() {
  const [kpi, setKpi] = useState<EarningsKpi | null>(null);
  const [spark, setSpark] = useState<SparkPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, sparkRes, paymentsRes] = await Promise.all([
        apiFetch<EarningsKpi>("/admin/earnings/kpi?period=30d&comparePrev=true"),
        apiFetch<{ series: SparkPoint[] }>("/admin/earnings/spark?period=30d"),
        apiFetch<{ items: PaymentItem[] }>("/admin/payments?limit=50"),
      ]);
      setKpi(kpiRes);
      setSpark(sparkRes.series);
      setTransactions(paymentsRes.items.map(toTransaction));
    } catch {
      // keep stale data on refresh failures
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await apiFetchBlob("/admin/payments/export");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payments.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const filtered = transactions.filter(
    (t) =>
      !search ||
      t.player.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedTxns = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagedGroups = groupByDate(pagedTxns);

  const sparkSeries = spark.map((p, i) => ({ i, v: Math.round(p.revenueFils / 100) }));

  const kpiCards = [
    {
      label: "Total Revenue",
      value: kpi ? formatAED(kpi.revenueFils) : formatAED(0),
      delta: formatDelta(kpi?.revenueDeltaPct),
      chart: (
        <SparklineArea
          data={sparkSeries}
          dataKey="v"
          stroke="#2ECC71"
          fillId="colorGreen"
          height={40}
        />
      ),
    },
    {
      label: "Transactions",
      value: kpi ? String(kpi.transactions) : "—",
      delta: formatDelta(kpi?.transactionsDeltaPct),
      chart: <SparklineBar data={sparkSeries} fill="#3498DB" height={40} />,
    },
    {
      label: "Avg Booking Value",
      value: kpi ? formatAED(kpi.avgFils) : formatAED(0),
      delta: formatDelta(kpi?.avgDeltaPct),
      chart: <SparklineLine data={sparkSeries} stroke="#D4AF37" height={40} />,
    },
    {
      label: "Refund Rate",
      value: kpi ? `${kpi.refundRatePct.toFixed(1).replace(/\.0$/, "")}%` : "—",
      delta: formatDelta(kpi?.refundRateDeltaPct),
      chart: (
        <SparklineArea
          data={sparkSeries}
          dataKey="v"
          stroke="#E74C3C"
          fillId="colorRed"
          height={40}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-th-bg relative overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-th-text">
            Payments & Billing
          </h1>
          <p className="mt-1 font-inter text-[14px] text-th-text-tertiary">
            Transaction history, revenue KPIs, and billing management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled
            title={COMING_SOON}
            className="flex h-[36px] items-center gap-2 rounded-lg border border-[var(--th-border)] px-4 font-inter text-[13px] text-th-text hover:bg-th-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FunnelSimple size={16} />
            Filter
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex h-[36px] items-center gap-2 rounded-lg border border-th-divider px-4 font-inter text-[13px] text-th-text hover:bg-th-card transition-colors disabled:opacity-50"
          >
            <DownloadSimple size={16} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpiCards.map((card) => {
            const deltaColor = card.delta == null
              ? "text-th-text-tertiary"
              : card.delta.isUp
                ? "text-[#2ECC71]"
                : "text-[#E74C3C]";
            return (
              <div
                key={card.label}
                className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-6"
              >
                <div className="flex items-center gap-1 mb-2">
                  <span className="font-inter text-[12px] font-medium text-th-text-tertiary uppercase tracking-wide">
                    {card.label}
                  </span>
                  <Info size={12} className="text-th-text-tertiary" />
                </div>
                <div className="font-display text-[28px] font-bold text-th-text leading-none mb-1">
                  {loading ? (
                    <div className="h-7 w-24 animate-pulse rounded bg-th-divider" />
                  ) : (
                    card.value
                  )}
                </div>
                <div className={`flex items-center gap-1 font-inter text-[12px] mb-3 ${deltaColor}`}>
                  {card.delta == null ? (
                    <span>—</span>
                  ) : (
                    <>
                      {card.delta.isUp ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {card.delta.text}
                    </>
                  )}
                </div>
                <div className="h-[40px] -mx-1">{card.chart}</div>
              </div>
            );
          })}
        </div>

        {/* Filter / search row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-th-text-tertiary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search transactions..."
                aria-label="Search transactions"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-[240px] h-[36px] bg-th-card border border-[var(--th-border)] rounded-full pl-9 pr-4 text-[13px] text-th-text placeholder:text-th-text-tertiary focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            {["Last 30 days", "All statuses", "All methods"].map((label) => (
              <button
                key={label}
                disabled
                title={COMING_SOON}
                className="flex h-[36px] items-center gap-1.5 px-4 bg-th-card border border-[var(--th-border)] rounded-full font-inter text-[13px] text-th-text hover:bg-[var(--th-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {label}
                <CaretDown size={12} />
              </button>
            ))}
          </div>
          <span className="font-inter text-[13px] text-th-text-tertiary">
            {filtered.length} transactions
          </span>
        </div>

        {/* Transactions table */}
        <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] overflow-hidden flex flex-col mb-6">
          {/* Table header */}
          <div className="h-[48px] bg-th-input border-b border-[var(--th-border)] flex items-center px-4 shrink-0">
            <div className="w-[180px] flex items-center gap-1 font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Date · Time
              <CaretDown size={12} />
            </div>
            <div className="flex-1 font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Player
            </div>
            <div className="w-[160px] font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Type
            </div>
            <div className="w-[160px] font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Method
            </div>
            <div className="w-[120px] text-right pr-4 font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Amount
            </div>
            <div className="w-[120px] font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
              Status
            </div>
            <div className="w-[40px]" />
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-th-divider" />
              ))}
            </div>
          ) : pagedGroups.length === 0 ? (
            <div className="p-12 text-center font-inter text-[14px] text-th-text-tertiary">
              No transactions found.
            </div>
          ) : (
            pagedGroups.map(({ date, items }) => (
              <div key={date}>
                {/* Group divider */}
                <div className="h-[32px] bg-white/[0.02] flex items-center px-4 font-inter text-[11px] font-medium text-th-text-tertiary uppercase tracking-wider">
                  {date}
                </div>
                {items.map((txn) => (
                  <div
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="h-[64px] border-t border-[var(--th-border)] hover:bg-[var(--th-hover)] cursor-pointer transition-colors flex items-center px-4"
                  >
                    <div className="w-[180px]">
                      <div className="font-inter text-[13px] text-th-text">{txn.date}</div>
                      <div className="font-inter text-[12px] text-th-text-tertiary">{txn.time}</div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <PlayerAvatar
                        url={txn.player.avatarUrl ?? null}
                        name={txn.player.name}
                        size={28}
                      />
                      <div className="min-w-0">
                        <div className="font-inter text-[13px] font-medium text-th-text truncate">
                          {txn.player.name}
                        </div>
                        {txn.player.email && (
                          <div className="font-inter text-[12px] text-th-text-tertiary truncate">
                            {txn.player.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-[160px]">
                      <TypePill type={txn.type} />
                    </div>
                    <div className="w-[160px]">
                      <MethodDisplay method={txn.method} />
                    </div>
                    <div
                      className={`w-[120px] text-right pr-4 font-mono text-[14px] font-medium ${
                        txn.amount.startsWith("−") ? "text-[#E74C3C]" : "text-th-text"
                      }`}
                    >
                      {txn.amount}
                    </div>
                    <div className="w-[120px]">
                      <StatusPill status={txn.status} />
                    </div>
                    <div className="w-[40px] flex justify-center">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-th-text-tertiary hover:text-[#D4AF37] transition-colors"
                        aria-label="Transaction actions"
                      >
                        <DotsThree size={20} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="font-inter text-[13px] text-th-text-tertiary">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} transactions
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-md font-inter text-[13px] text-th-text-tertiary hover:bg-[var(--th-hover)] hover:text-th-text transition-colors disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md font-inter text-[13px] transition-colors ${
                    p === page
                      ? "bg-[#0B3D2E] text-white font-medium"
                      : "text-th-text-tertiary hover:bg-[var(--th-hover)] hover:text-th-text"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-md font-inter text-[13px] text-th-text-tertiary hover:bg-[var(--th-hover)] hover:text-th-text transition-colors disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction detail drawer */}
      <Drawer
        isOpen={selectedTxn !== null}
        onClose={() => setSelectedTxn(null)}
        title="Transaction Detail"
        width="400px"
      >
        {selectedTxn && (
          <div className="flex flex-col">
            {/* Amount hero */}
            <div
              className={`font-display text-[32px] font-bold mb-1 ${
                selectedTxn.amount.startsWith("−") ? "text-[#E74C3C]" : "text-th-text"
              }`}
            >
              {selectedTxn.amount}
            </div>
            {/* TXN ID */}
            <div className="font-mono text-[13px] text-th-text-tertiary mb-3">
              TXN #{selectedTxn.id.slice(0, 16).toUpperCase()}
            </div>
            <StatusPill status={selectedTxn.status} />
            <div className="h-[1px] bg-[var(--th-hover)] my-6" />
            {/* Details grid */}
            <div className="grid grid-cols-[120px_1fr] gap-y-6">
              <span className="font-inter text-[13px] text-th-text-tertiary">Date</span>
              <span className="font-inter text-[13px] text-th-text">
                {selectedTxn.date} {selectedTxn.time}
              </span>
              <span className="font-inter text-[13px] text-th-text-tertiary">Player</span>
              <span className="font-inter text-[13px] text-th-text">
                {selectedTxn.player.name}
              </span>
              <span className="font-inter text-[13px] text-th-text-tertiary">Type</span>
              <TypePill type={selectedTxn.type} />
              <span className="font-inter text-[13px] text-th-text-tertiary">Method</span>
              <MethodDisplay method={selectedTxn.method} />
              {selectedTxn.bookingRef && (
                <>
                  <span className="font-inter text-[13px] text-th-text-tertiary">
                    Booking Ref
                  </span>
                  <span className="font-mono text-[13px] text-th-text">
                    {selectedTxn.bookingRef}
                  </span>
                </>
              )}
              <span className="font-inter text-[13px] text-th-text-tertiary">Receipt</span>
              <button
                disabled
                title={COMING_SOON_ACTIONS}
                className="flex items-center gap-1 text-[#D4AF37] hover:text-[#E8C654] transition-colors font-inter text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FilePdf size={14} />
                View PDF
              </button>
            </div>

            {/* Context-sensitive footer actions */}
            <div className="mt-8 flex gap-3">
              {selectedTxn.status === "Completed" && (
                <>
                  <button
                    disabled
                    title={COMING_SOON_ACTIONS}
                    className="flex-1 h-[44px] rounded-lg border border-[#E74C3C]/20 text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors font-inter text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Issue refund
                  </button>
                  <button
                    disabled
                    title={COMING_SOON_ACTIONS}
                    className="flex-1 h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    View receipt
                  </button>
                </>
              )}
              {selectedTxn.status === "Refunded" && (
                <button
                  disabled
                  title={COMING_SOON_ACTIONS}
                  className="w-full h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  View receipt
                </button>
              )}
              {selectedTxn.status === "Pending" && (
                <>
                  <button
                    disabled
                    title={COMING_SOON_ACTIONS}
                    className="flex-1 h-[44px] rounded-lg border border-[#E74C3C]/20 text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors font-inter text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    disabled
                    title={COMING_SOON_ACTIONS}
                    className="flex-1 h-[44px] rounded-lg bg-[#2ECC71] hover:bg-[#27AE60] text-black transition-colors font-inter text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mark completed
                  </button>
                </>
              )}
              {selectedTxn.status === "Failed" && (
                <button
                  disabled
                  title={COMING_SOON_ACTIONS}
                  className="w-full h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Retry payment
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
