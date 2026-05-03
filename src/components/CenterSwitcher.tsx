"use client";

import {
  useStaffMemberships,
  useActiveCenterId,
  persistActiveCenterId,
  ACTIVE_CENTER_PARAM,
} from "../lib/active-center";

export default function CenterSwitcher() {
  const { memberships } = useStaffMemberships();
  const active = useActiveCenterId();

  if (!memberships || memberships.length <= 1) return null;

  const onChange = (centerId: string) => {
    persistActiveCenterId(centerId);
    const next = new URLSearchParams(window.location.search);
    next.set(ACTIVE_CENTER_PARAM, centerId);
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}`);
    window.dispatchEvent(new Event("popstate"));
    window.location.reload();
  };

  return (
    <label className="block px-3 pb-3">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-th-text-tertiary">
        Active center
      </span>
      <select
        value={active ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-button border border-th-divider bg-th-input px-2 py-1.5 text-xs text-th-text"
      >
        {memberships.map((m) => (
          <option key={m.centerId} value={m.centerId}>
            {m.centerName}
          </option>
        ))}
      </select>
    </label>
  );
}
