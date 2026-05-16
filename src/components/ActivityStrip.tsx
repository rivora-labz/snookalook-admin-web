"use client";

import { CreditCard, UserPlus, WarningCircle, Clock, XCircle } from "phosphor-react";
import {
  useAdminActivity,
  formatRelativeTime,
  activityText,
  type AdminActivityItem,
} from "../lib/use-admin-activity";

function iconFor(item: AdminActivityItem) {
  switch (item.type) {
    case "cancellation":
      return <XCircle size={18} weight="fill" />;
    case "checkin":
      return <Clock size={18} weight="fill" />;
    case "no-show":
      return <WarningCircle size={18} weight="fill" />;
    case "booking":
    default:
      return <UserPlus size={18} weight="fill" />;
  }
}

export default function ActivityStrip() {
  const { items, isLoading, error } = useAdminActivity(20);

  if (error) {
    return (
      <div className="bg-th-card rounded-2xl p-6 border border-th-divider">
        <h2 className="font-display text-[16px] font-bold text-th-text mb-2">Recent activity stream</h2>
        <div className="text-th-text-tertiary text-[13px]">Couldn&apos;t load activity. Try again later.</div>
      </div>
    );
  }

  return (
    <div className="bg-th-card rounded-2xl p-6 border border-th-divider overflow-hidden">
      <h2 className="font-display text-[16px] font-bold text-th-text mb-4">Recent activity stream</h2>
      {isLoading ? (
        <div className="text-th-text-tertiary text-[13px]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 text-th-text-tertiary text-[13px]">
          <CreditCard size={18} weight="fill" />
          <span>No activity yet.</span>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {items.map((act) => (
            <div
              key={act.bookingId}
              className="h-[52px] bg-th-elevated rounded-xl border border-th-divider px-4 flex items-center gap-3 flex-shrink-0 min-w-[240px] hover:border-th-gold/30 transition-all cursor-default group"
            >
              <div className="text-th-gold bg-th-gold/10 p-2 rounded-lg group-hover:bg-th-gold/20 transition-colors">
                {iconFor(act)}
              </div>
              <div className="flex flex-col">
                <span className="font-inter text-[13px] font-bold text-th-text whitespace-nowrap">
                  {activityText(act)}
                </span>
                <span className="font-inter text-[11px] font-medium text-th-text-tertiary">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
