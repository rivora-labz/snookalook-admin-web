"use client";

import { CreditCard, UserPlus, WarningCircle, Clock } from "phosphor-react";

const activityData = [
  { icon: <CreditCard size={18} weight="fill" />, text: "Payment received AED 80", time: "2m ago" },
  { icon: <UserPlus size={18} weight="fill" />, text: "Faisal R. signed up", time: "5m ago" },
  { icon: <WarningCircle size={18} weight="fill" />, text: "Table 7 maintenance flagged", time: "12m ago" },
  { icon: <Clock size={18} weight="fill" />, text: "New booking from Ahmed K.", time: "18m ago" },
  { icon: <CreditCard size={18} weight="fill" />, text: "Payment received AED 150", time: "25m ago" },
  { icon: <UserPlus size={18} weight="fill" />, text: "Mohammed S. signed up", time: "30m ago" },
  { icon: <Clock size={18} weight="fill" />, text: "Booking cancelled by Layla A.", time: "1h ago" },
];

export default function ActivityStrip() {
  return (
    <div className="bg-th-card rounded-2xl p-6 border border-th-divider overflow-hidden">
      <h2 className="font-display text-[16px] font-bold text-th-text mb-4">Recent activity stream</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {activityData.map((act, i) => (
          <div 
            key={act.time + act.text + i} 
            className="h-[52px] bg-th-elevated rounded-xl border border-th-divider px-4 flex items-center gap-3 flex-shrink-0 min-w-[240px] hover:border-th-gold/30 transition-all cursor-default group"
          >
            <div className="text-th-gold bg-th-gold/10 p-2 rounded-lg group-hover:bg-th-gold/20 transition-colors">
              {act.icon}
            </div>
            <div className="flex flex-col">
              <span className="font-inter text-[13px] font-bold text-th-text whitespace-nowrap">{act.text}</span>
              <span className="font-inter text-[11px] font-medium text-th-text-tertiary">{act.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
