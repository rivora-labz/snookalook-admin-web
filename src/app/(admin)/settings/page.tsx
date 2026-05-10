"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Buildings, Clock, CurrencyCircleDollar, XCircle, UsersThree, Bank, Bell,
  Check, CheckCircle, DotsThree,
} from "phosphor-react";
import { toast } from "sonner";
import { apiFetch } from "../../../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

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

function InputField({
  label,
  value,
  onChange,
  placeholder = "",
  multiline = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 py-3 text-[14px] text-th-text font-inter focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)] transition-all resize-none h-[88px] placeholder:text-th-text-tertiary"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] text-[14px] text-th-text font-inter focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)] transition-all placeholder:text-th-text-tertiary"
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const markChanged = () => setHasUnsavedChanges(true);

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])");
    first?.focus();
  }, [activeTab]);

  const [profile, setProfile] = useState({
    name: "Grand Snooker Hub",
    description: "Dubai's most refined snooker destination. 14 championship tables, championship-spec cloth, craft beverages, and a members' lounge.",
    address: "Sheikh Zayed Road, Trade Centre 1, Dubai",
    phone: "+971 4 123 4567",
    email: "hello@grandsnookerhub.ae",
    website: "grandsnookerhub.ae",
    instagram: "@grandsnookerhub",
    whatsapp: "+971 50 123 4567",
  });

  const [businessHours, setBusinessHours] = useState([
    { day: "Monday", on: true, open: "14:00", close: "02:00" },
    { day: "Tuesday", on: true, open: "14:00", close: "02:00" },
    { day: "Wednesday", on: true, open: "14:00", close: "02:00" },
    { day: "Thursday", on: true, open: "14:00", close: "02:00" },
    { day: "Friday", on: true, open: "14:00", close: "03:00" },
    { day: "Saturday", on: true, open: "12:00", close: "03:00" },
    { day: "Sunday", on: true, open: "14:00", close: "01:00" },
  ]);

  const [pricing, setPricing] = useState({
    snooker: "120", pool: "80", billiards: "100",
    peakOn: true, peakPercent: "25", peakStart: "19:00", peakEnd: "23:00",
    memberOn: true, memberPercent: "15",
  });

  const [cancellation, setCancellation] = useState({ window: "3hr", deposit: 25, noShow: "80" });

  const [payouts, setPayouts] = useState({ schedule: "Weekly", trn: "100123456700003" });

  const [notifs, setNotifications] = useState({
    newBookings: true, cancellations: true, lowTable: false, weeklyReport: true,
    email: true, sms: false, push: true,
  });

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    setHasUnsavedChanges(false);
    toast.custom(() => (
      <div className="flex items-center gap-3 bg-th-card border border-[var(--th-border)] border-l-[3px] border-l-[#2ECC71] rounded-[10px] px-4 py-3 shadow-lg">
        <CheckCircle size={18} className="text-[#2ECC71]" />
        <div>
          <p className="text-[14px] font-medium text-th-text">Settings saved</p>
          <p className="text-[12px] text-th-text-secondary">Your changes have been applied</p>
        </div>
      </div>
    ), { position: "bottom-center", duration: 3000 });
    apiFetch(`/admin/settings/${activeTab}`, { method: "PUT", body: JSON.stringify({}) }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-th-bg">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-th-text mb-1">Club Settings</h1>
          <p className="font-inter text-[13px] text-th-text-tertiary">Manage business hours, pricing, and club details</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          )}
          <button
            onClick={handleSave}
            className={`h-[38px] px-5 rounded-[10px] text-[14px] font-medium transition-all bg-[#D4AF37] text-black ${
              hasUnsavedChanges
                ? "opacity-100 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:bg-[#F7D774]"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            Save Changes
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
                  <div className="flex flex-col gap-3 items-start">
                    <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Logo</label>
                    <div className="flex flex-col gap-4 items-start">
                      <div className="w-[96px] h-[96px] rounded-[14px] bg-black border border-[var(--th-border-medium)] flex items-center justify-center">
                        <span className="font-display font-bold text-[24px] text-[#0B3D2E]">GSH</span>
                      </div>
                      <button
                        onClick={markChanged}
                        className="text-[#D4AF37] hover:text-[#F7D774] hover:bg-[#D4AF37]/10 h-[36px] text-[13px] px-0 font-inter"
                      >
                        Upload new logo
                      </button>
                    </div>
                  </div>
                  <InputField label="Club Name" value={profile.name} onChange={(v) => { setProfile({ ...profile, name: v }); markChanged(); }} />
                  <InputField label="Description" value={profile.description} onChange={(v) => { setProfile({ ...profile, description: v }); markChanged(); }} multiline />
                  <div className="grid grid-cols-2 gap-6">
                    <InputField label="Address" value={profile.address} onChange={(v) => { setProfile({ ...profile, address: v }); markChanged(); }} />
                    <InputField label="Phone" value={profile.phone} onChange={(v) => { setProfile({ ...profile, phone: v }); markChanged(); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <InputField label="Email" value={profile.email} onChange={(v) => { setProfile({ ...profile, email: v }); markChanged(); }} />
                    <InputField label="Website" value={profile.website} onChange={(v) => { setProfile({ ...profile, website: v }); markChanged(); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <InputField label="Instagram Handle" value={profile.instagram} onChange={(v) => { setProfile({ ...profile, instagram: v }); markChanged(); }} />
                    <InputField label="WhatsApp Business" value={profile.whatsapp} onChange={(v) => { setProfile({ ...profile, whatsapp: v }); markChanged(); }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hours" && (
              <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                <SectionHeader title="Business Hours" subtitle="Set your standard weekly operating schedule." />
                <div className="flex flex-col gap-4">
                  {businessHours.map((day, idx) => (
                    <div key={day.day} className="flex items-center">
                      <div className="w-[120px] font-inter text-[13px] font-medium text-th-text">{day.day}</div>
                      <div className="mr-6">
                        <Toggle
                          checked={day.on}
                          onChange={(v) => {
                            setBusinessHours(businessHours.map((h, i) => i === idx ? { day: h.day, on: v, open: h.open, close: h.close } : h));
                            markChanged();
                          }}
                        />
                      </div>
                      <div className={`flex items-center gap-3 transition-opacity ${day.on ? "opacity-100" : "opacity-40"}`}>
                        <input
                          type="text"
                          pattern="[0-9]{2}:[0-9]{2}"
                          placeholder="HH:MM"
                          maxLength={5}
                          value={day.on ? day.open : ""}
                          disabled={!day.on}
                          onChange={(e) => {
                            setBusinessHours(businessHours.map((h, i) => i === idx ? { day: h.day, on: h.on, open: e.target.value, close: h.close } : h));
                            markChanged();
                          }}
                          className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                        />
                        <span className="text-th-text-tertiary">–</span>
                        <input
                          type="text"
                          pattern="[0-9]{2}:[0-9]{2}"
                          placeholder="HH:MM"
                          maxLength={5}
                          value={day.on ? day.close : ""}
                          disabled={!day.on}
                          onChange={(e) => {
                            setBusinessHours(businessHours.map((h, i) => i === idx ? { day: h.day, on: h.on, open: h.open, close: e.target.value } : h));
                            markChanged();
                          }}
                          className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                        />
                        {!day.on && <span className="ml-3 font-inter text-[13px] text-th-text-tertiary">Closed</span>}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex">
                    <button className="text-[#D4AF37] hover:text-[#F7D774] hover:bg-[#D4AF37]/10 h-[36px] text-[13px] font-inter px-0">
                      Holiday closures →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="flex flex-col gap-6">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Pricing Rules" subtitle="Base hourly rates for different table types." />
                  <div className="flex flex-col gap-4">
                    {(["Snooker", "Pool", "Billiards"] as const).map((type) => {
                      const key = type.toLowerCase() as "snooker" | "pool" | "billiards";
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-th-divider flex items-center justify-center">
                              <CurrencyCircleDollar size={16} className="text-[#D4AF37]" />
                            </div>
                            <span className="font-inter text-[14px] text-th-text">{type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-inter text-[13px] text-th-text-tertiary">AED</span>
                            <input
                              type="number"
                              value={pricing[key]}
                              onChange={(e) => { setPricing({ ...pricing, [key]: e.target.value }); markChanged(); }}
                              className="bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] w-[80px] text-[14px] text-th-text text-right focus:outline-none focus:border-[#D4AF37]"
                            />
                            <span className="font-inter text-[13px] text-th-text-tertiary">/ hr</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-[16px] font-semibold text-th-text">Peak-hour Surcharge</h2>
                      <p className="font-inter text-[13px] text-th-text-tertiary mt-1">Applied to all table types during peak window.</p>
                    </div>
                    <Toggle checked={pricing.peakOn} onChange={(v) => { setPricing({ ...pricing, peakOn: v }); markChanged(); }} />
                  </div>
                  <div className={`mt-6 flex items-center gap-4 transition-opacity ${pricing.peakOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-inter text-[13px] text-th-text-tertiary">+</span>
                      <input
                        type="number"
                        value={pricing.peakPercent}
                        onChange={(e) => { setPricing({ ...pricing, peakPercent: e.target.value }); markChanged(); }}
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
                        maxLength={5}
                        value={pricing.peakStart}
                        onChange={(e) => { setPricing({ ...pricing, peakStart: e.target.value }); markChanged(); }}
                        className="bg-th-bg border border-[var(--th-border)] rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37] w-[100px] text-center"
                      />
                      <span className="text-th-text-tertiary">to</span>
                      <input
                        type="text"
                        pattern="[0-9]{2}:[0-9]{2}"
                        placeholder="HH:MM"
                        maxLength={5}
                        value={pricing.peakEnd}
                        onChange={(e) => { setPricing({ ...pricing, peakEnd: e.target.value }); markChanged(); }}
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
                    <Toggle checked={pricing.memberOn} onChange={(v) => { setPricing({ ...pricing, memberOn: v }); markChanged(); }} />
                  </div>
                  <div className={`mt-6 flex items-center gap-2 transition-opacity ${pricing.memberOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <span className="font-inter text-[13px] text-th-text-tertiary">-</span>
                    <input
                      type="number"
                      value={pricing.memberPercent}
                      onChange={(e) => { setPricing({ ...pricing, memberPercent: e.target.value }); markChanged(); }}
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
                        {["1hr", "3hr", "6hr", "24hr"].map((w) => (
                          <button
                            key={w}
                            onClick={() => { setCancellation({ ...cancellation, window: w }); markChanged(); }}
                            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${cancellation.window === w ? "bg-th-divider text-th-text shadow" : "text-th-text-tertiary hover:text-th-text"}`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 max-w-[400px]">
                      <div className="flex justify-between items-center">
                        <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Required Deposit</label>
                        <span className="font-mono text-[14px] text-[#D4AF37] font-bold">{cancellation.deposit}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={cancellation.deposit}
                        onChange={(e) => { setCancellation({ ...cancellation, deposit: Number(e.target.value) }); markChanged(); }}
                        className="w-full accent-[#D4AF37] bg-[var(--th-active)] h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">No-show Fee</label>
                      <div className="relative w-[140px]">
                        <span className="absolute inset-y-0 left-3 flex items-center text-th-text-tertiary text-[13px]">AED</span>
                        <input
                          type="number"
                          value={cancellation.noShow}
                          onChange={(e) => { setCancellation({ ...cancellation, noShow: e.target.value }); markChanged(); }}
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
                  <button className="h-[32px] bg-[#D4AF37] hover:bg-[#F7D774] text-black font-display text-[12px] font-semibold px-4 rounded-lg transition-colors">
                    + Invite member
                  </button>
                </div>
                <div className="h-[1px] bg-[var(--th-hover)] mb-2" />
                <div className="flex flex-col">
                  {[
                    { name: "Hassan A.", email: "hassan@gsh.ae", role: "Owner", active: "Active now" },
                    { name: "Priya N.", email: "priya@gsh.ae", role: "Manager", active: "2 hours ago" },
                    { name: "Omar H.", email: "omar@gsh.ae", role: "Staff", active: "Yesterday" },
                    { name: "Faisal R.", email: "faisal@gsh.ae", role: "Staff", active: "3 days ago" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center justify-between py-4 border-b border-[var(--th-border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-th-divider overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <span className="font-inter text-[12px] font-semibold text-th-text-secondary">
                            {m.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-inter text-[14px] font-medium text-th-text">{m.name}</span>
                          <span className="font-inter text-[12px] text-th-text-tertiary">{m.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-[300px]">
                        <div className="w-24">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            m.role === "Owner" ? "bg-[#D4AF37] text-black" :
                            m.role === "Manager" ? "bg-[#0B3D2E] text-white" :
                            "bg-th-divider text-th-text"
                          }`}>
                            {m.role}
                          </span>
                        </div>
                        <span className="font-inter text-[12px] text-th-text-tertiary flex-1">{m.active}</span>
                        <button className="text-th-text-tertiary hover:text-th-text transition-colors">
                          <DotsThree size={16} weight="regular" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                          <span className="font-inter text-[14px] text-th-text">Emirates NBD •••• 4821</span>
                        </div>
                        <button className="font-inter text-[13px] text-[#D4AF37] hover:underline font-medium">Change</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Account Holder Name</label>
                      <input
                        type="text"
                        value="Grand Snooker Hub LLC"
                        readOnly
                        className="w-full bg-th-bg border border-[var(--th-border)] rounded-[10px] px-3 h-[40px] text-[14px] text-th-text opacity-60 cursor-not-allowed font-inter"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="font-inter text-[12px] font-medium uppercase tracking-[0.04em] text-th-text-tertiary">Payout Schedule</label>
                      <div className="flex bg-th-bg border border-[var(--th-border)] rounded-[10px] p-1 w-fit">
                        {["Weekly", "Bi-weekly", "Monthly"].map((s) => (
                          <button
                            key={s}
                            onClick={() => { setPayouts({ ...payouts, schedule: s }); markChanged(); }}
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
                      onChange={(v) => { setPayouts({ ...payouts, trn: v }); markChanged(); }}
                    />
                  </div>
                </div>
                <p className="font-inter text-[12px] text-th-text-tertiary px-4">
                  Payouts processed every Monday. Next payout:{" "}
                  <span className="text-th-text">AED 12,480</span> on 27 Apr 2026.
                </p>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="flex flex-col gap-6">
                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <SectionHeader title="Event Alerts" subtitle="Configure which activities generate alerts." />
                  <div className="flex flex-col gap-6">
                    {[
                      { key: "newBookings", label: "New bookings", desc: "Get notified when a new booking comes in" },
                      { key: "cancellations", label: "Cancellations", desc: "Get notified when a booking is cancelled" },
                      { key: "lowTable", label: "Low table availability", desc: "Alert when over 90% of tables are booked" },
                      { key: "weeklyReport", label: "Weekly performance report", desc: "Receive a summary every Monday morning" },
                    ].map((n) => (
                      <div key={n.key} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-inter text-[14px] font-medium text-th-text">{n.label}</span>
                          <span className="font-inter text-[13px] text-th-text-tertiary mt-0.5">{n.desc}</span>
                        </div>
                        <Toggle
                          checked={(notifs as Record<string, boolean>)[n.key] ?? false}
                          onChange={(v) => { setNotifications({ ...notifs, [n.key]: v }); markChanged(); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-th-card rounded-[14px] border border-[var(--th-border)] p-7">
                  <h2 className="font-display text-[16px] font-semibold text-th-text mb-6">Delivery Channels</h2>
                  <div className="flex flex-col gap-4">
                    {[
                      { key: "email", label: "Email", sub: "hassan@gsh.ae" },
                      { key: "sms", label: "SMS", sub: null },
                      { key: "push", label: "Push notifications", sub: null },
                    ].map((ch) => {
                      const checked = (notifs as Record<string, boolean>)[ch.key];
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
                              onChange={(e) => { setNotifications({ ...notifs, [ch.key]: e.target.checked }); markChanged(); }}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-inter text-[14px] text-th-text">{ch.label}</span>
                            {ch.sub && <span className="font-inter text-[12px] text-th-text-tertiary">{ch.sub}</span>}
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
    </div>
  );
}
