"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
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
import { apiFetch, apiFetchBlob } from "../../../lib/api";
import Drawer from "../../../components/Drawer";

// Static sparkline arrays — replace with API time-series in a later task
const SPARK_1 = [40, 55, 35, 70, 60, 80, 90, 75, 85, 95];
const SPARK_2 = [20, 30, 25, 40, 35, 45, 30, 50, 45, 55];
const SPARK_3 = [60, 50, 70, 55, 65, 75, 60, 80, 70, 90];
const SPARK_4 = [5, 3, 4, 2, 3, 4, 3, 2, 3, 2];

// -- Helper components --

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

// -- Interfaces --

interface Transaction {
  id: string;
  date: string;
  time: string;
  player: { id: string; name: string; email: string; avatarUrl?: string | null };
  type: TxnType;
  method: string;
  amount: string;
  status: TxnStatus;
  bookingRef?: string;
}

interface Kpis {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  avgBookingValue: number;
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
  const d = new Date(p.createdAt);
  const amtAED = p.amount / 100;
  return {
    id: p.id,
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    player: {
      id: p.booking.host.id,
      name: p.booking.host.displayName,
      email: "",
      avatarUrl: p.booking.host.avatarUrl,
    },
    type: "Booking",
    method: p.method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    amount: amtAED < 0 ? `−AED ${Math.abs(amtAED).toLocaleString()}` : `AED ${amtAED.toLocaleString()}`,
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

const PAGE_SIZE = 12;

export default function EarningsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, paymentsRes] = await Promise.all([
        apiFetch<{ kpis: Kpis }>("/admin/analytics?period=30d"),
        apiFetch<{ items: PaymentItem[] }>("/admin/payments?limit=50"),
      ]);
      setKpis(analyticsRes.kpis);
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

  const handleAction = (msg: string) => {
    toast(msg);
    setSelectedTxn(null);
  };

  const kpiCards = [
    {
      label: "Total Revenue",
      value: kpis
        ? `AED ${Math.round(kpis.revenueMonth / 100).toLocaleString()}`
        : "AED 48,720",
      delta: "+12.4%",
      positive: true,
      chart: (
        <AreaChart
          data={SPARK_1.map((v, i) => ({ i, v }))}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#2ECC71"
            fill="url(#colorGreen)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      ),
    },
    {
      label: "Transactions",
      value: "312",
      delta: "+8.2%",
      positive: true,
      chart: (
        <BarChart
          data={SPARK_2.map((v, i) => ({ i, v }))}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <Bar dataKey="v" fill="#3498DB" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      ),
    },
    {
      label: "Avg Booking Value",
      value: kpis
        ? `AED ${Math.round(kpis.avgBookingValue / 100).toLocaleString()}`
        : "AED 156",
      delta: "+3.1%",
      positive: true,
      chart: (
        <LineChart
          data={SPARK_3.map((v, i) => ({ i, v }))}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <Line
            type="monotone"
            dataKey="v"
            stroke="#D4AF37"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      ),
    },
    {
      label: "Refund Rate",
      value: "2.4%",
      delta: "-0.3%",
      positive: false,
      chart: (
        <AreaChart
          data={SPARK_4.map((v, i) => ({ i, v }))}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#E74C3C"
            fill="url(#colorRed)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
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
          <button className="flex h-[36px] items-center gap-2 rounded-lg border border-[var(--th-border)] px-4 font-inter text-[13px] text-th-text hover:bg-th-card transition-colors">
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
          {kpiCards.map((card) => (
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
              <div
                className={`flex items-center gap-1 font-inter text-[12px] mb-3 ${
                  card.positive ? "text-[#2ECC71]" : "text-[#E74C3C]"
                }`}
              >
                {card.positive ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
                {card.delta}
              </div>
              <div className="h-[40px] -mx-1">
                <ResponsiveContainer width="100%" height={40}>
                  {card.chart}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
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
                className="flex h-[36px] items-center gap-1.5 px-4 bg-th-card border border-[var(--th-border)] rounded-full font-inter text-[13px] text-th-text hover:bg-[var(--th-hover)] transition-colors"
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
                      <img
                        src={
                          txn.player.avatarUrl ??
                          `https://i.pravatar.cc/28?u=${txn.player.id}`
                        }
                        alt=""
                        className="w-7 h-7 rounded-full shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
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
              <button className="flex items-center gap-1 text-[#D4AF37] hover:text-[#E8C654] transition-colors font-inter text-[13px]">
                <FilePdf size={14} />
                View PDF
              </button>
            </div>

            {/* Context-sensitive footer actions */}
            <div className="mt-8 flex gap-3">
              {selectedTxn.status === "Completed" && (
                <>
                  <button
                    onClick={() => handleAction("Refund initiated")}
                    className="flex-1 h-[44px] rounded-lg border border-[#E74C3C]/20 text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors font-inter text-[14px]"
                  >
                    Issue refund
                  </button>
                  <button
                    onClick={() => handleAction("Receipt opened")}
                    className="flex-1 h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold"
                  >
                    View receipt
                  </button>
                </>
              )}
              {selectedTxn.status === "Refunded" && (
                <button
                  onClick={() => handleAction("Receipt opened")}
                  className="w-full h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold"
                >
                  View receipt
                </button>
              )}
              {selectedTxn.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleAction("Transaction cancelled")}
                    className="flex-1 h-[44px] rounded-lg border border-[#E74C3C]/20 text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors font-inter text-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("Marked as completed")}
                    className="flex-1 h-[44px] rounded-lg bg-[#2ECC71] hover:bg-[#27AE60] text-black transition-colors font-inter text-[14px] font-semibold"
                  >
                    Mark completed
                  </button>
                </>
              )}
              {selectedTxn.status === "Failed" && (
                <button
                  onClick={() => handleAction("Payment retry initiated")}
                  className="w-full h-[44px] rounded-lg bg-[#D4AF37] hover:bg-[#E8C654] text-black transition-colors font-inter text-[14px] font-semibold"
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
