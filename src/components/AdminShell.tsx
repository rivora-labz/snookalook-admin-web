"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Check, WarningCircle } from "phosphor-react";
import { Toaster, toast } from "sonner";
import AdminNav from "./AdminNav";
import AdminHeader from "./AdminHeader";
import DrawerOverlay from "./DrawerOverlay";
import PlayerAvatar from "./PlayerAvatar";
import { AdminProvider, useAdmin } from "../lib/AdminContext";
import { apiFetch, formatAED } from "../lib/api";
import {
  useAdminActivity,
  formatRelativeTime,
  activityTypeMeta,
  activityText,
  type AdminActivityItem,
} from "../lib/use-admin-activity";

interface PlayerListItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  skillTier: string | null;
  winRate: number | null;
  gamesPlayed: number;
  rating: number;
  joinedAt: string;
}

interface TableListItem {
  id: string;
  centerId: string;
  tableNumber: number;
  type: string;
  hourlyRate: number;
  pricePerHourFils: number | null;
  status: string;
  currentBooking: { id: string; host: { displayName: string }; startAt: string; endAt: string } | null;
}

const ACTIVITY_FILTERS = ["All", "Bookings", "Players", "Payments"] as const;
type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let halfHour = 14 * 2; halfHour < 24 * 2; halfHour++) {
    const hour24 = Math.floor(halfHour / 2);
    const min = halfHour % 2 === 0 ? "00" : "30";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const suffix = hour24 < 12 ? "AM" : "PM";
    slots.push(`${hour12}:${min} ${suffix}`);
  }
  return slots;
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { isBookingOpen, setIsBookingOpen, isActivityOpen, setIsActivityOpen } =
    useAdmin();

  const [bookingPlayer, setBookingPlayer] = useState("");
  const [bookingPlayerAvatar, setBookingPlayerAvatar] = useState("");
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingTableId, setBookingTableId] = useState("");
  const [bookingDuration, setBookingDuration] = useState("1 hr");
  const [customDuration, setCustomDuration] = useState(1);

  const [actFilter, setActFilter] = useState<ActivityFilter>("All");
  const [actFlash, setActFlash] = useState<string | null>(null);

  const [playerQuery, setPlayerQuery] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  const [tables, setTables] = useState<TableListItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  const { items: activityItems, isLoading: activityLoading } = useAdminActivity(20);

  const playerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBookingOpen(false);
        setIsActivityOpen(false);
        setIsPlayerDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setIsBookingOpen, setIsActivityOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        playerDropdownRef.current &&
        !playerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPlayerDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load players for booking drawer (debounced search).
  useEffect(() => {
    if (!isBookingOpen) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setPlayersLoading(true);
      const q = playerQuery.trim();
      const path = `/admin/players${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      apiFetch<{ items: PlayerListItem[] }>(path)
        .then((res) => {
          if (cancelled) return;
          setPlayers(res.items);
        })
        .catch(() => {
          if (cancelled) return;
          setPlayers([]);
        })
        .finally(() => {
          if (cancelled) return;
          setPlayersLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [isBookingOpen, playerQuery]);

  // Load tables fleet for booking drawer.
  useEffect(() => {
    if (!isBookingOpen) return;
    let cancelled = false;
    setTablesLoading(true);
    apiFetch<{ items: TableListItem[] }>("/admin/tables")
      .then((res) => {
        if (cancelled) return;
        setTables(res.items);
      })
      .catch(() => {
        if (cancelled) return;
        setTables([]);
      })
      .finally(() => {
        if (cancelled) return;
        setTablesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isBookingOpen]);

  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === bookingTableId) ?? null,
    [tables, bookingTableId],
  );

  const isBookingValid =
    bookingPlayer !== "" &&
    bookingSlot !== "" &&
    bookingTableId !== "" &&
    (bookingDuration !== "Custom" || customDuration > 0);

  const handleBookingConfirm = () => {
    if (!isBookingValid) return;
    toast.custom(
      () => (
        <div className="flex items-center gap-3 bg-th-card border-l-[3px] border-[#2ECC71] rounded-xl px-4 py-3 w-[320px] shadow-lg">
          <div className="w-5 h-5 rounded-full bg-[#2ECC71]/20 flex items-center justify-center flex-shrink-0">
            <Check size={12} weight="bold" className="text-[#2ECC71]" />
          </div>
          <span className="font-inter text-[13px] text-th-text font-medium truncate">
            Booking confirmed for {bookingPlayer} · T{selectedTable?.tableNumber ?? "?"} · {bookingSlot}
          </span>
        </div>
      ),
      { duration: 3000, position: "bottom-center" }
    );
    setIsBookingOpen(false);
    setBookingPlayer("");
    setBookingPlayerAvatar("");
    setBookingSlot("");
    setBookingTableId("");
    setBookingDuration("1 hr");
    setCustomDuration(1);
  };

  const handleActivityClick = (id: string) => {
    setActFlash(id);
    setTimeout(() => {
      setIsActivityOpen(false);
      setActFlash(null);
    }, 100);
  };

  const filteredActivity = activityItems.filter((a) => {
    if (actFilter === "All") return true;
    const cat = activityTypeMeta(a.type).category;
    if (actFilter === "Bookings") return cat === "booking";
    if (actFilter === "Players") return cat === "player";
    if (actFilter === "Payments") return cat === "payment";
    return true;
  });

  return (
    <div className="flex h-full w-full bg-th-bg text-th-text overflow-hidden">
      <AdminNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-th-bg p-8 relative">
          {children}
          <button
            data-testid="sentry-probe-button"
            onClick={() => {
              throw new Error("sentry-liveness-probe-admin-web-1778934626");
            }}
            className="fixed bottom-4 right-4 z-[200] px-3 py-2 rounded-lg bg-red-600 text-white text-[12px] font-mono shadow-lg hover:bg-red-700"
          >
            __sentry_probe__
          </button>
        </main>
      </div>

      {/* Booking Drawer */}
      <DrawerOverlay
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-th-bg border-l border-th-card z-[101] transform transition-transform duration-[250ms] ease-out flex flex-col ${
          isBookingOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-th-card">
          <h2 className="font-display text-[20px] font-semibold text-th-text">
            New Booking
          </h2>
          <button
            onClick={() => setIsBookingOpen(false)}
            className="text-th-text-tertiary hover:text-th-text"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Player */}
          <div className="flex flex-col gap-2 relative" ref={playerDropdownRef}>
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Player
            </label>
            <div className="relative">
              {bookingPlayerAvatar && (
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <PlayerAvatar url={null} name={bookingPlayer || "?"} size={20} />
                </div>
              )}
              <input
                type="text"
                placeholder="Search player or add guest..."
                className={`w-full bg-th-card border border-th-divider rounded-xl py-3 text-[14px] text-th-text focus:outline-none focus:border-[#D4AF37] ${
                  bookingPlayerAvatar ? "pl-10 pr-4" : "px-4"
                }`}
                value={bookingPlayer}
                onChange={(e) => {
                  setBookingPlayer(e.target.value);
                  setPlayerQuery(e.target.value);
                  setIsPlayerDropdownOpen(true);
                }}
                onClick={() => setIsPlayerDropdownOpen(true)}
              />
            </div>
            {isPlayerDropdownOpen && (
              <div className="absolute top-[100%] mt-1 inset-x-0 bg-th-input border border-th-border rounded-xl overflow-hidden z-50 py-1.5 shadow-[var(--th-shadow-modal)] max-h-[280px] overflow-y-auto">
                {playersLoading && (
                  <div className="px-3 py-2 text-th-text-tertiary text-[12px]">Searching…</div>
                )}
                {!playersLoading && players.length === 0 && (
                  <div className="px-3 py-2 text-th-text-tertiary text-[12px]">No players found.</div>
                )}
                {players.map((p) => (
                  <div
                    key={p.userId}
                    onClick={() => {
                      setBookingPlayer(p.displayName);
                      setBookingPlayerAvatar(p.avatarUrl ?? p.displayName);
                      setIsPlayerDropdownOpen(false);
                    }}
                    className="px-3 h-[36px] flex items-center justify-between hover:bg-[var(--th-hover)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar url={p.avatarUrl} name={p.displayName} size={24} />
                      <span className="font-inter text-th-text text-[13px] font-medium">
                        {p.displayName}
                      </span>
                    </div>
                    {p.skillTier && (
                      <span
                        className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${
                          p.skillTier === "PRO" || p.skillTier === "EXPERT"
                            ? "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10"
                            : "text-th-text-tertiary border-[rgba(128,128,128,0.3)] bg-[rgba(128,128,128,0.1)]"
                        }`}
                      >
                        {p.skillTier}
                      </span>
                    )}
                  </div>
                ))}
                <div className="h-[1px] bg-[var(--th-hover)] my-1.5" />
                <div
                  onClick={() => {
                    setBookingPlayer("Guest");
                    setBookingPlayerAvatar("");
                    setIsPlayerDropdownOpen(false);
                  }}
                  className="px-3 h-[36px] flex items-center text-[#D4AF37] text-[13px] font-medium hover:bg-[var(--th-hover)] cursor-pointer transition-colors"
                >
                  + Add guest
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Date
            </label>
            <input
              type="date"
              className="w-full bg-th-card border border-th-divider rounded-xl px-4 py-3 text-[14px] text-th-text focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Time Slot */}
          <div className="flex flex-col gap-2">
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Time Slot
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {timeSlots.map((t) => {
                const selected = t === bookingSlot;
                return (
                  <button
                    key={t}
                    onClick={() => setBookingSlot(selected ? "" : t)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-inter text-[13px] border transition-all ${
                      selected
                        ? "bg-[#0B3D2E] border-[#D4AF37] text-th-text shadow-[inset_0_0_0_1px_rgba(212,175,55,1)]"
                        : "bg-th-card border-th-border-medium text-th-text hover:border-[#D4AF37]/50"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-2">
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Table
            </label>
            {tablesLoading && (
              <div className="text-th-text-tertiary text-[12px]">Loading fleet…</div>
            )}
            {!tablesLoading && tables.length === 0 && (
              <div className="text-th-text-tertiary text-[12px]">No tables found for this center.</div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {tables.map((t) => {
                const booked = t.currentBooking !== null || t.status === "MAINTENANCE";
                const selected = bookingTableId === t.id;
                const tId = `T${t.tableNumber}`;
                return (
                  <button
                    key={t.id}
                    disabled={booked}
                    onClick={() => setBookingTableId(selected ? "" : t.id)}
                    className={`relative flex flex-col p-3 rounded-xl border transition-all ${
                      selected
                        ? "bg-[#0B3D2E] border-[#D4AF37]"
                        : booked
                        ? "bg-th-elevated border-th-border opacity-50 cursor-not-allowed"
                        : "bg-th-card border-th-divider hover:border-th-border-medium"
                    }`}
                  >
                    <span
                      className={`font-display text-[14px] ${
                        selected
                          ? "text-th-text"
                          : booked
                          ? "text-th-text-tertiary"
                          : "text-th-text"
                      }`}
                    >
                      {tId}
                    </span>
                    <span
                      className={`font-inter text-[10px] mt-1 transition-colors ${
                        selected ? "text-[#D4AF37]" : "text-th-text-tertiary"
                      }`}
                    >
                      {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                    </span>
                    {booked && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E74C3C]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Duration
            </label>
            <div className="flex bg-th-card rounded-xl p-1 border border-th-divider">
              {["1 hr", "2 hr", "3 hr", "Custom"].map((d) => (
                <button
                  key={d}
                  onClick={() => setBookingDuration(d)}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                    bookingDuration === d
                      ? "bg-th-divider text-th-text shadow"
                      : "text-th-text-tertiary hover:text-th-text"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {bookingDuration === "Custom" && (
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={customDuration}
                  onChange={(e) =>
                    setCustomDuration(Number(e.target.value) || 1)
                  }
                  className="w-20 bg-th-card border border-th-divider rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="font-inter text-[13px] text-th-text-tertiary">
                  hours
                </span>
              </div>
            )}
          </div>

          {/* Total Card */}
          <div className="mt-4 bg-th-card rounded-xl p-4 border-l-4 border-[#D4AF37] shadow-lg">
            {(() => {
              const hours =
                bookingDuration === "Custom"
                  ? customDuration
                  : parseInt(bookingDuration);
              const ratePerHourFils = selectedTable?.pricePerHourFils ?? selectedTable?.hourlyRate ?? 0;
              const totalFils = hours * ratePerHourFils;
              return (
                <>
                  <div className="font-mono text-[18px] font-bold text-th-text mb-1">
                    Total: {formatAED(totalFils)}
                  </div>
                  <div className="font-inter text-[12px] text-th-text-tertiary">
                    {hours} {hours === 1 ? "hour" : "hours"} × {formatAED(ratePerHourFils)}/hr
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="p-6 border-t border-th-card bg-th-bg flex gap-4 sticky bottom-0">
          <button
            onClick={() => setIsBookingOpen(false)}
            className="flex-1 h-[40px] rounded-lg font-inter text-[14px] text-th-text-tertiary hover:text-th-text hover:bg-[var(--th-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={isBookingValid ? handleBookingConfirm : undefined}
            className={`flex-1 h-[40px] rounded-lg font-inter text-[14px] font-semibold transition-all ${
              isBookingValid
                ? "bg-[#D4AF37] hover:bg-[#F7D774] text-black"
                : "bg-[#D4AF37]/50 text-black/50 cursor-not-allowed"
            }`}
          >
            Confirm Booking
          </button>
        </div>
      </div>

      {/* Activity Drawer */}
      <DrawerOverlay
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-th-bg border-l border-th-card z-[101] transform transition-transform duration-[250ms] ease-out flex flex-col ${
          isActivityOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-th-card">
          <h2 className="font-display text-[18px] font-semibold text-th-text">
            Recent Activity
          </h2>
          <div className="flex items-center gap-4">
            <button className="font-inter text-[12px] text-[#D4AF37] hover:underline">
              Mark all read
            </button>
            <button
              onClick={() => setIsActivityOpen(false)}
              className="text-th-text-tertiary hover:text-th-text"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-th-card">
          <div className="flex gap-2">
            {ACTIVITY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  actFilter === f
                    ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/50"
                    : "bg-th-card text-th-text-tertiary border border-th-border hover:text-th-text"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activityLoading ? (
            <div className="h-full flex items-center justify-center text-th-text-tertiary text-[13px]">
              Loading activity…
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <WarningCircle size={48} className="text-th-text-tertiary mb-4" />
              <div className="font-inter text-[14px] text-th-text">
                No activity in this filter
              </div>
              <div className="font-inter text-[12px] text-th-text-tertiary mt-2">
                Try selecting a different category.
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredActivity.map((act: AdminActivityItem) => {
                const meta = activityTypeMeta(act.type);
                return (
                  <div
                    key={act.bookingId}
                    onClick={() => handleActivityClick(act.bookingId)}
                    className={`p-4 border-b border-th-card/50 flex gap-4 cursor-pointer transition-colors ${
                      actFlash === act.bookingId ? "bg-[#D4AF37]/20" : "hover:bg-th-card"
                    }`}
                  >
                    <div className="mt-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="font-inter text-[13px] text-th-text/90 leading-snug">
                        {activityText(act)}
                      </div>
                      <div className="font-inter text-[11px] text-th-text-tertiary">
                        {formatRelativeTime(act.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="py-6 font-inter text-[13px] text-th-text-tertiary hover:text-th-text text-center w-full transition-colors">
                View all activity →
              </button>
            </div>
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminProvider>
  );
}
