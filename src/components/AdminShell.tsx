"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, WarningCircle } from "phosphor-react";
import { Toaster, toast } from "sonner";
import AdminNav from "./AdminNav";
import AdminHeader from "./AdminHeader";
import DrawerOverlay from "./DrawerOverlay";
import { AdminProvider, useAdmin } from "../lib/AdminContext";

const ACTIVITY_MOCKS = [
  { id: 1, type: "booking", color: "#3498DB", text: "Ahmed K. booked Table 4 · 2:00 PM", time: "12 min ago", unread: true },
  { id: 2, type: "booking", color: "#E74C3C", text: "Booking cancelled by Layla A.", time: "1h ago", unread: true },
  { id: 3, type: "payment", color: "#2ECC71", text: "Payment received AED 80", time: "2h ago", unread: false },
  { id: 4, type: "player", color: "#D4AF37", text: "Faisal R. upgraded to PRO tier", time: "Yesterday", unread: false },
  { id: 5, type: "payment", color: "#2ECC71", text: "Payment refunded AED 120", time: "Yesterday", unread: false },
  { id: 6, type: "player", color: "#8e44ad", text: "Mohammed S. signed up", time: "Yesterday", unread: false },
  { id: 7, type: "booking", color: "#3498DB", text: "Zaid K. booked Table 9 · 9:00 PM", time: "Earlier this week", unread: false },
  { id: 8, type: "payment", color: "#2ECC71", text: "Payment received AED 240", time: "Earlier this week", unread: false },
];

const PLAYERS = [
  { name: "Ahmed K.", tier: "Pro", avatar: "ahmed" },
  { name: "Layla A.", tier: "Amateur", avatar: "layla" },
  { name: "Faisal R.", tier: "Pro", avatar: "faisal" },
  { name: "Omar H.", tier: "Beginner", avatar: "omar" },
  { name: "Mohammed S.", tier: "Expert", avatar: "mohammed" },
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { isBookingOpen, setIsBookingOpen, isActivityOpen, setIsActivityOpen } =
    useAdmin();

  const [bookingPlayer, setBookingPlayer] = useState("");
  const [bookingPlayerAvatar, setBookingPlayerAvatar] = useState("");
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingTable, setBookingTable] = useState("");
  const [bookingDuration, setBookingDuration] = useState("1 hr");
  const [customDuration, setCustomDuration] = useState(1);

  const [actFilter, setActFilter] = useState("All");
  const [actFlash, setActFlash] = useState<number | null>(null);

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

  const isBookingValid =
    bookingPlayer !== "" &&
    bookingSlot !== "" &&
    bookingTable !== "" &&
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
            Booking confirmed for {bookingPlayer} · {bookingTable} · {bookingSlot}
          </span>
        </div>
      ),
      { duration: 3000, position: "bottom-center" }
    );
    setIsBookingOpen(false);
    setBookingPlayer("");
    setBookingPlayerAvatar("");
    setBookingSlot("");
    setBookingTable("");
    setBookingDuration("1 hr");
    setCustomDuration(1);
  };

  const handleActivityClick = (id: number) => {
    setActFlash(id);
    setTimeout(() => {
      setIsActivityOpen(false);
      setActFlash(null);
    }, 100);
  };

  const filteredActivity = ACTIVITY_MOCKS.filter((a) => {
    if (actFilter === "All") return true;
    if (actFilter === "Bookings") return a.type === "booking";
    if (actFilter === "Players") return a.type === "player";
    if (actFilter === "Payments") return a.type === "payment";
    return true;
  });

  return (
    <div className="flex h-full w-full bg-th-bg text-th-text overflow-hidden">
      <AdminNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-th-bg p-8 relative">
          {children}
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
                  <img
                    src={`https://i.pravatar.cc/100?u=${bookingPlayerAvatar}`}
                    className="w-5 h-5 rounded-full"
                    alt=""
                  />
                </div>
              )}
              <input
                type="text"
                placeholder="Search player or add guest..."
                className={`w-full bg-th-card border border-th-divider rounded-xl py-3 text-[14px] text-th-text focus:outline-none focus:border-[#D4AF37] ${
                  bookingPlayerAvatar ? "pl-10 pr-4" : "px-4"
                }`}
                value={bookingPlayer}
                onChange={(e) => setBookingPlayer(e.target.value)}
                onClick={() => setIsPlayerDropdownOpen(true)}
              />
            </div>
            {isPlayerDropdownOpen && (
              <div className="absolute top-[100%] mt-1 inset-x-0 bg-th-input border border-th-border rounded-xl overflow-hidden z-50 py-1.5 shadow-[var(--th-shadow-modal)]">
                {PLAYERS.map((p) => (
                  <div
                    key={p.name}
                    onClick={() => {
                      setBookingPlayer(p.name);
                      setBookingPlayerAvatar(p.avatar);
                      setIsPlayerDropdownOpen(false);
                    }}
                    className="px-3 h-[36px] flex items-center justify-between hover:bg-[var(--th-hover)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://i.pravatar.cc/100?u=${p.avatar}`}
                        className="w-6 h-6 rounded-full"
                        alt=""
                      />
                      <span className="font-inter text-th-text text-[13px] font-medium">
                        {p.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${
                        p.tier === "Pro" || p.tier === "Expert"
                          ? "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10"
                          : "text-th-text-tertiary border-[rgba(128,128,128,0.3)] bg-[rgba(128,128,128,0.1)]"
                      }`}
                    >
                      {p.tier}
                    </span>
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
              {["2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"].map(
                (t, i) => {
                  const disabled = i > 2;
                  const selected = t === bookingSlot;
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        !disabled && setBookingSlot(selected ? "" : t)
                      }
                      className={`flex-shrink-0 px-4 py-2 rounded-lg font-inter text-[13px] border transition-all ${
                        selected
                          ? "bg-[#0B3D2E] border-[#D4AF37] text-th-text shadow-[inset_0_0_0_1px_rgba(212,175,55,1)]"
                          : disabled
                          ? "opacity-40 cursor-not-allowed bg-th-card border-th-border text-th-text-tertiary"
                          : "bg-th-card border-th-border-medium text-th-text hover:border-[#D4AF37]/50"
                      }`}
                    >
                      {t}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-2">
            <label className="font-inter text-[12px] text-th-text-tertiary">
              Table
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const booked = num === 2 || num === 5;
                const tId = `T${num}`;
                const selected = bookingTable === tId;
                return (
                  <button
                    key={num}
                    disabled={booked}
                    onClick={() => setBookingTable(selected ? "" : tId)}
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
                      Snooker
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
              const total = hours * 120;
              return (
                <>
                  <div className="font-mono text-[18px] font-bold text-th-text mb-1">
                    Total: AED {total}
                  </div>
                  <div className="font-inter text-[12px] text-th-text-tertiary">
                    {hours} {hours === 1 ? "hour" : "hours"} × AED 120/hr
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
            {["All", "Bookings", "Players", "Payments"].map((f) => (
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
          {filteredActivity.length === 0 ? (
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
              {filteredActivity.map((act) => (
                <div
                  key={act.id}
                  onClick={() => handleActivityClick(act.id)}
                  className={`p-4 border-b border-th-card/50 flex gap-4 cursor-pointer transition-colors ${
                    actFlash === act.id ? "bg-[#D4AF37]/20" : "hover:bg-th-card"
                  }`}
                >
                  <div className="mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: act.color }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="font-inter text-[13px] text-th-text/90 leading-snug">
                      {act.text}
                    </div>
                    <div className="font-inter text-[11px] text-th-text-tertiary">
                      {act.time}
                    </div>
                  </div>
                  {act.unread && (
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
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
