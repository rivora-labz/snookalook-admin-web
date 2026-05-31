"use client";

import { useState, useEffect, useRef, useId } from "react";
import {
  Buildings, Clock, CurrencyCircleDollar, XCircle, UsersThree, Bank, Bell,
  Check, CheckCircle, DotsThree, X,
} from "phosphor-react";
import { toast } from "sonner";
import { apiFetch } from "../../../lib/api";
import { useFocusTrap } from "../../../lib/use-focus-trap";

const TABS = [
  { id: "profile", label: "Club Profile", icon: Buildings },
  { id: "hours", label: "Business Hours", icon: Clock },
  { id: "pricing", label: "Pricing Rules", icon: CurrencyCircleDollar },
  { id: "cancellation", label: "Cancellation Policy", icon: XCircle },
  { id: "team", label: "Team & Roles", icon: UsersThree },
  { id: "payouts", label: "Payouts", icon: Bank },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type DayName = (typeof DAYS)[number];

interface ProfileState {
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  heroImage: string | null;
}

interface DayHours { on: boolean; open: string; close: string }
type HoursState = Record<DayName, DayHours>;

interface PricingState {
  snookerFils: number;
  poolFils: number;
  billiardsFils: number;
  peakOn: boolean;
  peakPercent: number;
  peakStart: string;
  peakEnd: string;
  memberOn: boolean;
  memberPercent: number;
}

interface CancellationState {
  windowKey: "1hr" | "3hr" | "6hr" | "24hr";
  freeCancelMinutes: number;
  depositPercent: number;
  noShowFils: number;
}

interface PayoutsState {
  schedule: "Weekly" | "Bi-weekly" | "Monthly";
  trn: string;
  bankLabel: string;
  accountHolder: string;
  nextPayoutFils: number | null;
  nextPayoutDate: string | null;
}

interface NotificationsState {
  newBookings: boolean;
  cancellations: boolean;
  lowTable: boolean;
  weeklyReport: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface TeamMember {
  id: string;
  user: { id: string; displayName: string; avatarUrl: string | null; email: string | null; phone: string | null };
  role: "OWNER" | "MANAGER" | "STAFF";
  createdAt: string;
}

const DEFAULT_HOURS: HoursState = DAYS.reduce((acc, day) => {
  acc[day] = { on: true, open: "14:00", close: "02:00" };
  return acc;
}, {} as HoursState);

const WINDOW_TO_MINUTES: Record<CancellationState["windowKey"], number> = {
  "1hr": 60, "3hr": 180, "6hr": 360, "24hr": 1440,
};

function minutesToWindow(minutes: number): CancellationState["windowKey"] {
  if (minutes <= 60) return "1hr";
  if (minutes <= 180) return "3hr";
  if (minutes <= 360) return "6hr";
  return "24hr";
}

function InputField({
  label, value, onChange, placeholder = "", multiline = false, className = "", disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const fieldId = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={fieldId} className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">{label}</label>
      {multiline ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 py-3 text-[14px] text-th-text font-inter focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)] transition-all resize-none h-[88px] placeholder:text-th-text-tertiary disabled:opacity-60"
        />
      ) : (
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] text-[14px] text-th-text font-inter focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)] transition-all placeholder:text-th-text-tertiary disabled:opacity-60"
        />
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? "bg-[#0B3D2E]" : "bg-th-divider"}`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[16px] font-semibold text-th-text">{title}</h2>
      <p className="font-inter text-[13px] text-th-text-tertiary mt-1">{subtitle}</p>
      <div className="h-[1px] bg-[var(--th-hover)] mt-4" />
    </div>
  );
}

interface SettingsPayload {
  profile: ProfileState;
  hours: Record<string, unknown>;
  pricing: Record<string, unknown>;
  cancellation: Record<string, unknown>;
  payouts: Record<string, unknown>;
  notifications: Record<string, unknown>;
}

function hydrateHours(raw: Record<string, unknown> | undefined): HoursState {
  const out: HoursState = { ...DEFAULT_HOURS };
  if (!raw) return out;
  // Shape A: { Monday: {on, open, close}, ... }
  for (const day of DAYS) {
    const v = raw[day];
    if (v && typeof v === "object") {
      const dv = v as Partial<DayHours>;
      out[day] = {
        on: dv.on ?? true,
        open: dv.open ?? "14:00",
        close: dv.close ?? "02:00",
      };
    }
  }
  // Shape B: { default: {open, close} } — apply to all days
  const def = raw.default as { open?: string; close?: string } | undefined;
  if (def?.open && def?.close && !DAYS.some((d) => raw[d])) {
    for (const day of DAYS) {
      out[day] = { on: true, open: def.open, close: def.close };
    }
  }
  return out;
}

function hydratePricing(raw: Record<string, unknown> | undefined): PricingState {
  const r = raw ?? {};
  return {
    snookerFils: Number(r.snookerFils ?? 0),
    poolFils: Number(r.poolFils ?? 0),
    billiardsFils: Number(r.billiardsFils ?? 0),
    peakOn: Boolean((r.peak as any)?.on),
    peakPercent: Number((r.peak as any)?.percent ?? 0),
    peakStart: String((r.peak as any)?.start ?? "19:00"),
    peakEnd: String((r.peak as any)?.end ?? "23:00"),
    memberOn: Boolean((r.member as any)?.on),
    memberPercent: Number((r.member as any)?.percent ?? 0),
  };
}

function hydrateCancellation(raw: Record<string, unknown> | undefined): CancellationState {
  const r = raw ?? {};
  const minutes = Number(r.freeCancelMinutes ?? 180);
  return {
    windowKey: minutesToWindow(minutes),
    freeCancelMinutes: minutes,
    depositPercent: Number(r.depositPercent ?? r.penaltyPercent ?? 25),
    noShowFils: Number(r.noShowFils ?? 0),
  };
}

function hydratePayouts(raw: Record<string, unknown> | undefined): PayoutsState {
  const r = raw ?? {};
  const scheduleVal = String(r.schedule ?? "Weekly");
  const schedule: PayoutsState["schedule"] =
    scheduleVal === "Bi-weekly" || scheduleVal === "Monthly" ? scheduleVal as PayoutsState["schedule"] : "Weekly";
  return {
    schedule,
    trn: String(r.trn ?? ""),
    bankLabel: String((r.bank as any)?.label ?? ""),
    accountHolder: String((r.bank as any)?.accountHolder ?? ""),
    nextPayoutFils: r.nextPayoutFils != null ? Number(r.nextPayoutFils) : null,
    nextPayoutDate: r.nextPayoutDate != null ? String(r.nextPayoutDate) : null,
  };
}

function hydrateNotifications(raw: Record<string, unknown> | undefined): NotificationsState {
  const r = raw ?? {};
  return {
    newBookings: Boolean(r.newBookings ?? true),
    cancellations: Boolean(r.cancellations ?? true),
    lowTable: Boolean(r.lowTable ?? false),
    weeklyReport: Boolean(r.weeklyReport ?? true),
    email: Boolean(r.email ?? true),
    sms: Boolean(r.sms ?? false),
    push: Boolean(r.push ?? true),
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [dirty, setDirty] = useState<Set<TabId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<ProfileState>({
    name: "", address: "", city: "", lat: null, lng: null, heroImage: null,
  });
  const [businessHours, setBusinessHours] = useState<HoursState>(DEFAULT_HOURS);
  const [pricing, setPricing] = useState<PricingState>({
    snookerFils: 0, poolFils: 0, billiardsFils: 0,
    peakOn: false, peakPercent: 0, peakStart: "19:00", peakEnd: "23:00",
    memberOn: false, memberPercent: 0,
  });
  const [cancellation, setCancellation] = useState<CancellationState>({
    windowKey: "3hr", freeCancelMinutes: 180, depositPercent: 25, noShowFils: 0,
  });
  const [payouts, setPayouts] = useState<PayoutsState>({
    schedule: "Weekly", trn: "", bankLabel: "", accountHolder: "",
    nextPayoutFils: null, nextPayoutDate: null,
  });
  const [notifs, setNotifications] = useState<NotificationsState>({
    newBookings: true, cancellations: true, lowTable: false, weeklyReport: true,
    email: true, sms: false, push: true,
  });

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MANAGER" | "STAFF">("STAFF");
  const [inviteBusy, setInviteBusy] = useState(false);
  const inviteTitleId = useId();
  const inviteDialogRef = useFocusTrap<HTMLDivElement>(inviteOpen, () => {
    if (!inviteBusy) setInviteOpen(false);
  });

  const markChanged = (tab: TabId = activeTab) => {
    setDirty((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])");
    first?.focus();
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<SettingsPayload>("/admin/settings")
      .then((res) => {
        if (cancelled) return;
        setProfile({
          name: res.profile?.name ?? "",
          address: res.profile?.address ?? "",
          city: res.profile?.city ?? "",
          lat: res.profile?.lat ?? null,
          lng: res.profile?.lng ?? null,
          heroImage: res.profile?.heroImage ?? null,
        });
        setBusinessHours(hydrateHours(res.hours));
        setPricing(hydratePricing(res.pricing));
        setCancellation(hydrateCancellation(res.cancellation));
        setPayouts(hydratePayouts(res.payouts));
        setNotifications(hydrateNotifications(res.notifications));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message ?? "Failed to load settings.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Load team on mount + when team tab opens
  useEffect(() => {
    if (activeTab !== "team") return;
    let cancelled = false;
    setTeamLoading(true);
    apiFetch<{ items: TeamMember[] }>("/admin/team")
      .then((res) => {
        if (cancelled) return;
        setTeam(res.items);
      })
      .catch(() => {
        if (cancelled) return;
        setTeam([]);
      })
      .finally(() => {
        if (cancelled) return;
        setTeamLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const sectionBody = (section: TabId): unknown => {
    switch (section) {
      case "profile":
        return { name: profile.name, address: profile.address, city: profile.city };
      case "hours":
        return businessHours;
      case "pricing":
        return {
          snookerFils: pricing.snookerFils,
          poolFils: pricing.poolFils,
          billiardsFils: pricing.billiardsFils,
          peak: { on: pricing.peakOn, percent: pricing.peakPercent, start: pricing.peakStart, end: pricing.peakEnd },
          member: { on: pricing.memberOn, percent: pricing.memberPercent },
        };
      case "cancellation":
        return {
          freeCancelMinutes: cancellation.freeCancelMinutes,
          depositPercent: cancellation.depositPercent,
          noShowFils: cancellation.noShowFils,
        };
      case "payouts":
        return {
          schedule: payouts.schedule,
          trn: payouts.trn,
          bank: { label: payouts.bankLabel, accountHolder: payouts.accountHolder },
        };
      case "notifications":
        return notifs;
      case "team":
        return null;
    }
  };

  const handleSave = async () => {
    if (activeTab === "team") return;
    if (!dirty.has(activeTab) || saving) return;
    const body = sectionBody(activeTab);
    if (body == null) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/settings/${activeTab}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setDirty((prev) => {
        if (!prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.delete(activeTab);
        return next;
      });
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-th-card border border-[var(--th-border)] border-l-[3px] border-l-[#2ECC71] rounded-[10px] px-4 py-3 shadow-lg">
          <CheckCircle size={18} className="text-[#2ECC71]" />
          <div>
            <p className="text-[14px] font-medium text-th-text">Settings saved</p>
            <p className="text-[12px] text-th-text-secondary">Your changes have been applied</p>
          </div>
        </div>
      ), { position: "bottom-center", duration: 3000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteUserId || inviteBusy) return;
    setInviteBusy(true);
    try {
      const member = await apiFetch<TeamMember>("/admin/team", {
        method: "POST",
        body: JSON.stringify({ userId: inviteUserId, role: inviteRole }),
      });
      setTeam((prev) => [...prev, member]);
      setInviteOpen(false);
      setInviteUserId("");
      setInviteRole("STAFF");
      toast.success("Team member added");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member.";
      toast.error(msg);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await apiFetch(`/admin/team/${id}`, { method: "DELETE" });
      setTeam((prev) => prev.filter((m) => m.id !== id));
      toast.success("Team member removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member.";
      toast.error(msg);
    }
  };

  const tabDirty = dirty.has(activeTab);
  const hasUnsaved = activeTab !== "team" && tabDirty;

  if (loading) {
    return <div className="flex items-center justify-center h-full text-th-text-tertiary">Loading settings…</div>;
  }
  if (loadError) {
    return <div className="flex items-center justify-center h-full text-th-text-tertiary">Couldn&apos;t load settings: {loadError}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-th-bg">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-th-text mb-1">Club Settings</h1>
          <p className="font-inter text-[13px] text-th-text-tertiary">Manage business hours, pricing, and club details</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsaved && (
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          )}
          <button
            onClick={handleSave}
            disabled={!hasUnsaved || saving}
            className={`h-[38px] px-5 rounded-[10px] text-[14px] font-medium transition-all bg-[#D4AF37] text-black ${
              hasUnsaved && !saving
                ? "opacity-100 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:bg-[#F7D774]"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left nav */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-1.5 border-r border-[var(--th-border)] pr-4 sticky top-0">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-3 h-[36px] px-3 rounded-lg font-inter text-[13px] font-medium transition-colors ${
                  isActive
                    ? "text-[#D4AF37] bg-[#D4AF37]/10"
                    : "text-th-text-tertiary hover:text-th-text-secondary hover:bg-[var(--th-hover)]"
                }`}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#D4AF37] rounded-r" />}
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                {label}
                {dirty.has(id) && id !== "team" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right content pane */}
        <div className="flex-1 pl-8 overflow-y-auto custom-scrollbar" ref={containerRef}>
          <div className="max-w-[820px] pb-12">

            {activeTab === "profile" && (
              <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                <SectionHeader title="Club Profile" subtitle="Public details visible to players on the app." />
                <div className="flex flex-col gap-6">
                  <InputField label="Club Name" value={profile.name} onChange={(v) => { setProfile({ ...profile, name: v }); markChanged("profile"); }} />
                  <InputField label="Address" value={profile.address} onChange={(v) => { setProfile({ ...profile, address: v }); markChanged("profile"); }} />
                  <InputField label="City" value={profile.city} onChange={(v) => { setProfile({ ...profile, city: v }); markChanged("profile"); }} />
                </div>
              </div>
            )}

            {activeTab === "hours" && (
              <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                <SectionHeader title="Business Hours" subtitle="Set your standard weekly operating schedule." />
                <div className="flex flex-col gap-4">
                  {DAYS.map((day) => {
                    const dh = businessHours[day];
                    return (
                      <div key={day} className="flex items-center">
                        <div className="w-[120px] font-inter text-[13px] font-medium text-th-text">{day}</div>
                        <div className="mr-6">
                          <Toggle
                            checked={dh.on}
                            onChange={(v) => {
                              setBusinessHours({ ...businessHours, [day]: { ...dh, on: v } });
                              markChanged("hours");
                            }}
                          />
                        </div>
                        <div className={`flex items-center gap-3 transition-opacity ${dh.on ? "opacity-100" : "opacity-40"}`}>
                          <input
                            type="text"
                            pattern="[0-9]{2}:[0-9]{2}"
                            placeholder="HH:MM"
                            aria-label={`${day} open time`}
                            maxLength={5}
                            value={dh.on ? dh.open : ""}
                            disabled={!dh.on}
                            onChange={(e) => {
                              setBusinessHours({ ...businessHours, [day]: { ...dh, open: e.target.value } });
                              markChanged("hours");
                            }}
                            className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                          />
                          <span className="text-th-text-tertiary">–</span>
                          <input
                            type="text"
                            pattern="[0-9]{2}:[0-9]{2}"
                            placeholder="HH:MM"
                            aria-label={`${day} close time`}
                            maxLength={5}
                            value={dh.on ? dh.close : ""}
                            disabled={!dh.on}
                            onChange={(e) => {
                              setBusinessHours({ ...businessHours, [day]: { ...dh, close: e.target.value } });
                              markChanged("hours");
                            }}
                            className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                          />
                          {!dh.on && <span className="ml-3 font-inter text-[13px] text-th-text-tertiary">Closed</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="flex flex-col gap-6">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Pricing Rules" subtitle="Base hourly rates for different table types (AED)." />
                  <div className="flex flex-col gap-4">
                    {([
                      { label: "Snooker", key: "snookerFils" },
                      { label: "Pool", key: "poolFils" },
                      { label: "Billiards", key: "billiardsFils" },
                    ] as const).map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-th-divider flex items-center justify-center">
                            <CurrencyCircleDollar size={16} className="text-[#D4AF37]" />
                          </div>
                          <span className="font-inter text-[14px] text-th-text">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-inter text-[13px] text-th-text-tertiary">AED</span>
                          <input
                            type="number"
                            aria-label={`${label} hourly rate in AED`}
                            value={Math.round(pricing[key] / 100)}
                            onChange={(e) => {
                              const aed = Number(e.target.value) || 0;
                              setPricing({ ...pricing, [key]: aed * 100 });
                              markChanged("pricing");
                            }}
                            className="bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] w-[80px] text-[14px] text-th-text text-right focus:outline-none focus:border-[#D4AF37]"
                          />
                          <span className="font-inter text-[13px] text-th-text-tertiary">/ hr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-[16px] font-semibold text-th-text">Peak-hour Surcharge</h2>
                      <p className="font-inter text-[13px] text-th-text-tertiary mt-1">Applied to all table types during peak window.</p>
                    </div>
                    <Toggle checked={pricing.peakOn} onChange={(v) => { setPricing({ ...pricing, peakOn: v }); markChanged("pricing"); }} />
                  </div>
                  <div className={`mt-6 flex items-center gap-4 transition-opacity ${pricing.peakOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-inter text-[13px] text-th-text-tertiary">+</span>
                      <input
                        type="number"
                        aria-label="Peak-hour surcharge percent"
                        value={pricing.peakPercent}
                        onChange={(e) => { setPricing({ ...pricing, peakPercent: Number(e.target.value) || 0 }); markChanged("pricing"); }}
                        className="bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] w-[70px] text-[14px] text-th-text text-right focus:outline-none focus:border-[#D4AF37]"
                      />
                      <span className="font-inter text-[13px] text-th-text-tertiary">%</span>
                    </div>
                    <div className="h-6 w-[1px] bg-[var(--th-active)]" />
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        pattern="[0-9]{2}:[0-9]{2}"
                        placeholder="HH:MM"
                        aria-label="Peak-hour start time"
                        maxLength={5}
                        value={pricing.peakStart}
                        onChange={(e) => { setPricing({ ...pricing, peakStart: e.target.value }); markChanged("pricing"); }}
                        className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                      />
                      <span className="text-th-text-tertiary">to</span>
                      <input
                        type="text"
                        pattern="[0-9]{2}:[0-9]{2}"
                        placeholder="HH:MM"
                        aria-label="Peak-hour end time"
                        maxLength={5}
                        value={pricing.peakEnd}
                        onChange={(e) => { setPricing({ ...pricing, peakEnd: e.target.value }); markChanged("pricing"); }}
                        className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-[16px] font-semibold text-th-text">Member Discount</h2>
                      <p className="font-inter text-[13px] text-th-text-tertiary mt-1">Discount applied to registered members.</p>
                    </div>
                    <Toggle checked={pricing.memberOn} onChange={(v) => { setPricing({ ...pricing, memberOn: v }); markChanged("pricing"); }} />
                  </div>
                  <div className={`mt-6 flex items-center gap-2 transition-opacity ${pricing.memberOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <span className="font-inter text-[13px] text-th-text-tertiary">-</span>
                    <input
                      type="number"
                      aria-label="Member discount percent"
                      value={pricing.memberPercent}
                      onChange={(e) => { setPricing({ ...pricing, memberPercent: Number(e.target.value) || 0 }); markChanged("pricing"); }}
                      className="bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] w-[70px] text-[14px] text-th-text text-right focus:outline-none focus:border-[#D4AF37]"
                    />
                    <span className="font-inter text-[13px] text-th-text-tertiary">%</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cancellation" && (
              <div className="flex flex-col gap-4">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Cancellation Policy" subtitle="Configure deposit and no-show rules." />
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Free cancellation window</label>
                      <div className="flex bg-th-bg border border-[var(--th-border)] rounded-[10px] p-1 w-fit">
                        {(["1hr", "3hr", "6hr", "24hr"] as const).map((w) => (
                          <button
                            key={w}
                            onClick={() => {
                              setCancellation({ ...cancellation, windowKey: w, freeCancelMinutes: WINDOW_TO_MINUTES[w] });
                              markChanged("cancellation");
                            }}
                            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${cancellation.windowKey === w ? "bg-th-divider text-th-text shadow" : "text-th-text-tertiary hover:text-th-text"}`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 max-w-[400px]">
                      <div className="flex justify-between items-center">
                        <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Required Deposit</label>
                        <span className="font-mono text-[14px] text-[#D4AF37] font-bold">{cancellation.depositPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        aria-label="Required deposit percent"
                        value={cancellation.depositPercent}
                        onChange={(e) => { setCancellation({ ...cancellation, depositPercent: Number(e.target.value) }); markChanged("cancellation"); }}
                        className="w-full accent-[#D4AF37] bg-[var(--th-active)] h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">No-show Fee</label>
                      <div className="relative w-[140px]">
                        <span className="absolute inset-y-0 left-3 flex items-center text-th-text-tertiary text-[13px]">AED</span>
                        <input
                          type="number"
                          aria-label="No-show fee in AED"
                          value={Math.round(cancellation.noShowFils / 100)}
                          onChange={(e) => {
                            const aed = Number(e.target.value) || 0;
                            setCancellation({ ...cancellation, noShowFils: aed * 100 });
                            markChanged("cancellation");
                          }}
                          className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] pl-10 pr-3 h-[40px] text-[14px] text-th-text focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="font-inter text-[12px] text-th-text-tertiary px-4">
                  Applies to all bookings. Individual exceptions can be made from the Bookings screen.
                </p>
              </div>
            )}

            {activeTab === "team" && (
              <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-display text-[16px] font-semibold text-th-text">Team & Roles</h2>
                    <p className="font-inter text-[13px] text-th-text-tertiary mt-1">Manage staff access to the admin dashboard.</p>
                  </div>
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="h-[32px] bg-[#D4AF37] hover:bg-[#F7D774] text-black font-display text-[12px] font-semibold px-4 rounded-lg transition-colors"
                  >
                    + Invite member
                  </button>
                </div>
                <div className="h-[1px] bg-[var(--th-hover)] mb-2" />
                <div className="flex flex-col">
                  {teamLoading && (
                    <div className="py-6 text-th-text-tertiary text-[13px]">Loading team…</div>
                  )}
                  {!teamLoading && team.length === 0 && (
                    <div className="py-6 text-th-text-tertiary text-[13px]">No team members yet.</div>
                  )}
                  {team.map((m) => {
                    const display = m.user.displayName ?? m.user.email ?? m.user.id;
                    const initial = display.charAt(0).toUpperCase();
                    const roleLabel = m.role.charAt(0) + m.role.slice(1).toLowerCase();
                    return (
                      <div key={m.id} className="flex items-center justify-between py-4 border-b border-[var(--th-border)] last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-th-divider overflow-hidden flex-shrink-0 flex items-center justify-center">
                            <span className="font-inter text-[12px] font-semibold text-th-text-secondary">{initial}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-inter text-[14px] font-medium text-th-text">{display}</span>
                            <span className="font-inter text-[12px] text-th-text-tertiary">{m.user.email ?? m.user.phone ?? "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 w-[300px]">
                          <div className="w-24">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              m.role === "OWNER" ? "bg-[#D4AF37] text-black" :
                              m.role === "MANAGER" ? "bg-[#0B3D2E] text-white" :
                              "bg-th-divider text-th-text"
                            }`}>
                              {roleLabel}
                            </span>
                          </div>
                          <span className="font-inter text-[12px] text-th-text-tertiary flex-1">
                            Added {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            title="Remove member"
                            className="text-th-text-tertiary hover:text-[#E74C3C] transition-colors"
                          >
                            <DotsThree size={16} weight="regular" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "payouts" && (
              <div className="flex flex-col gap-4">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Payouts" subtitle="Manage bank details and payout schedules." />
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Bank Account</label>
                      <div className="flex items-center justify-between bg-th-bg border border-[var(--th-border)] rounded-[10px] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Bank size={18} className="text-th-text-tertiary" />
                          <span className="font-inter text-[14px] text-th-text">
                            {payouts.bankLabel || "—"}
                          </span>
                        </div>
                        <button
                          disabled
                          title="Coming soon — requires Tabby + Stripe webhook hookup"
                          className="font-inter text-[13px] text-[#D4AF37] font-medium opacity-60 cursor-not-allowed"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                    <InputField
                      label="Account Holder Name"
                      value={payouts.accountHolder}
                      onChange={(v) => { setPayouts({ ...payouts, accountHolder: v }); markChanged("payouts"); }}
                    />
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Payout Schedule</label>
                      <div className="flex bg-th-bg border border-[var(--th-border)] rounded-[10px] p-1 w-fit">
                        {(["Weekly", "Bi-weekly", "Monthly"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => { setPayouts({ ...payouts, schedule: s }); markChanged("payouts"); }}
                            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${payouts.schedule === s ? "bg-th-divider text-th-text shadow" : "text-th-text-tertiary hover:text-th-text"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <InputField
                      label="Tax Registration (TRN)"
                      value={payouts.trn}
                      onChange={(v) => { setPayouts({ ...payouts, trn: v }); markChanged("payouts"); }}
                    />
                  </div>
                </div>
                {payouts.nextPayoutFils != null && payouts.nextPayoutDate && (
                  <p className="font-inter text-[12px] text-th-text-tertiary px-4">
                    Next payout: <span className="text-th-text">AED {(payouts.nextPayoutFils / 100).toLocaleString("en-AE")}</span> on {new Date(payouts.nextPayoutDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
                  </p>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="flex flex-col gap-6">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Event Alerts" subtitle="Configure which activities generate alerts." />
                  <div className="flex flex-col gap-6">
                    {([
                      { key: "newBookings", label: "New bookings", desc: "Get notified when a new booking comes in" },
                      { key: "cancellations", label: "Cancellations", desc: "Get notified when a booking is cancelled" },
                      { key: "lowTable", label: "Low table availability", desc: "Alert when over 90% of tables are booked" },
                      { key: "weeklyReport", label: "Weekly performance report", desc: "Receive a summary every Monday morning" },
                    ] as const).map((n) => (
                      <div key={n.key} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-inter text-[14px] font-medium text-th-text">{n.label}</span>
                          <span className="font-inter text-[13px] text-th-text-tertiary mt-0.5">{n.desc}</span>
                        </div>
                        <Toggle
                          checked={notifs[n.key]}
                          onChange={(v) => { setNotifications({ ...notifs, [n.key]: v }); markChanged("notifications"); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <h2 className="font-display text-[16px] font-semibold text-th-text mb-6">Delivery Channels</h2>
                  <div className="flex flex-col gap-4">
                    {([
                      { key: "email", label: "Email" },
                      { key: "sms", label: "SMS" },
                      { key: "push", label: "Push notifications" },
                    ] as const).map((ch) => {
                      const checked = notifs[ch.key];
                      return (
                        <label key={ch.key} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className={`relative flex items-center justify-center w-5 h-5 rounded border ${
                              checked
                                ? "border-[#D4AF37] bg-[#D4AF37]/10"
                                : "border-[var(--th-border)] bg-transparent group-hover:border-[#D4AF37]/50"
                            }`}
                          >
                            {checked && <Check size={12} weight="bold" className="text-[#D4AF37]" />}
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={(e) => { setNotifications({ ...notifs, [ch.key]: e.target.checked }); markChanged("notifications"); }}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-inter text-[14px] text-th-text">{ch.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby={inviteTitleId}
          onClick={() => !inviteBusy && setInviteOpen(false)}
        >
          <div ref={inviteDialogRef} className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 id={inviteTitleId} className="font-display text-[16px] font-semibold text-th-text">Invite team member</h3>
              <button onClick={() => !inviteBusy && setInviteOpen(false)} className="text-th-text-tertiary hover:text-th-text"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <InputField
                label="User ID"
                value={inviteUserId}
                onChange={setInviteUserId}
                placeholder="uuid of existing user"
              />
              <div className="flex flex-col gap-2">
                <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Role</label>
                <div className="flex bg-th-bg border border-[var(--th-border)] rounded-[10px] p-1 w-fit">
                  {(["OWNER", "MANAGER", "STAFF"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${inviteRole === r ? "bg-th-divider text-th-text shadow" : "text-th-text-tertiary hover:text-th-text"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => !inviteBusy && setInviteOpen(false)}
                  className="h-[36px] px-4 rounded-lg font-inter text-[13px] text-th-text-tertiary hover:text-th-text hover:bg-[var(--th-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteUserId || inviteBusy}
                  className={`h-[36px] px-4 rounded-lg font-inter text-[13px] font-semibold bg-[#D4AF37] text-black ${
                    !inviteUserId || inviteBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-[#F7D774]"
                  }`}
                >
                  {inviteBusy ? "Adding…" : "Add member"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
