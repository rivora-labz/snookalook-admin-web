"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { apiFetch } from "../lib/api";
import { formatTime } from "../lib/datetime";
import PlayerAvatar from "./PlayerAvatar";

interface ScheduleSlot {
  time: string;
  name: string;
  table: string;
  status: "CONFIRMED" | "PENDING" | "WALK-IN";
  avatarUrl: string | null;
}

export default function SchedulePanel() {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        // In a real app, this would be a specific schedule endpoint
        // For now, we'll fetch today's bookings and format them
        const res = await apiFetch<{ items: any[] }>("/admin/bookings?from=today&to=today");
        const formatted = res.items.slice(0, 8).map(b => ({
          time: formatTime(b.startAt),
          name: b.host.displayName,
          table: `Table ${b.table?.tableNumber || "--"}`,
          status: b.state === "CONFIRMED" ? "CONFIRMED" : "PENDING",
          avatarUrl: b.host.avatarUrl
        }));
        setSchedule(formatted as ScheduleSlot[]);
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="bg-th-card rounded-2xl p-6 border border-th-divider flex flex-col h-full animate-pulse">
        <div className="h-6 w-32 bg-th-divider rounded mb-6" />
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[60px] bg-th-divider rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-th-card rounded-2xl p-6 border border-th-divider flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[16px] font-bold text-th-text">Today&apos;s Schedule</h2>
        <button className="text-[11px] font-bold uppercase tracking-wider font-inter text-th-text-tertiary hover:text-th-text px-2 py-1 bg-th-hover rounded transition-colors">
          Next 4 hours ▾
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
          {schedule.length === 0 ? (
            <div className="p-8 text-center text-sm text-th-text-tertiary">No upcoming bookings.</div>
          ) : (
            schedule.map((slot, i) => (
              <div 
                key={slot.name + slot.time + i} 
                className="h-[60px] flex items-center bg-th-elevated rounded-xl border border-th-divider p-3 flex-shrink-0 hover:border-th-border-medium transition-colors cursor-pointer group"
                style={{ opacity: Math.max(0.6, 1 - (i * 0.05)) }}
              >
                <div className="w-[48px] flex-shrink-0 font-display text-[14px] font-bold text-th-text group-hover:text-th-gold transition-colors">
                  {slot.time}
                </div>
                
                <div className="flex-1 flex items-center gap-3 px-3 border-l border-th-divider ml-1">
                  <PlayerAvatar
                    url={slot.avatarUrl}
                    name={slot.name}
                    size={28}
                    className="ring-1 ring-th-border-medium"
                  />

                  <div className="flex flex-col min-w-0">
                    <span className="font-inter text-[13px] font-bold text-th-text truncate">{slot.name}</span>
                    <span className="font-inter text-[11px] font-medium text-th-text-tertiary">{slot.table}</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {slot.status === 'CONFIRMED' && <span className="w-2 h-2 rounded-full bg-th-gold shadow-[0_0_8px_rgba(212,175,55,0.4)] block" title="Confirmed" />}
                  {slot.status === 'PENDING' && <span className="w-2 h-2 rounded-full border border-[#3498DB] block" title="Pending" />}
                  {slot.status === 'WALK-IN' && <span className="w-2 h-2 rounded-full bg-[#2ECC71] block" title="Walk-in" />}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-th-card to-transparent pointer-events-none"></div>
      </div>
      
      <Link href="/bookings" className="text-th-gold font-inter text-[12px] font-bold mt-4 hover:underline transition-all">
        View full calendar →
      </Link>
    </div>
  );
}
