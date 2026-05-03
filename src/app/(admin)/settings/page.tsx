"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

interface SettingsData {
  profile: {
    name: string;
    address: string;
    city: string;
    lat?: number;
    lng?: number;
    heroImage: string | null;
  };
  hours: Record<string, { open: string; close: string }>;
  pricing: Record<string, unknown>;
  cancellation: { freeCancelMinutes: number; penaltyPercent: number };
  payouts: Record<string, unknown>;
  notifications: Record<string, unknown>;
}

function SectionCard({
  title,
  saving,
  onSave,
  children,
}: {
  title: string;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-th-divider bg-th-card p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl text-th-text">{title}</h2>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-button bg-th-gold px-3 py-1.5 text-xs font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-th-text-tertiary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Editable state
  const [profile, setProfile] = useState({ name: "", address: "", city: "", phone: "" });
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({});
  const [cancellation, setCancellation] = useState({ freeCancelMinutes: 60, penaltyPercent: 50 });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch<SettingsData>("/admin/settings");
      setData(res);
      setProfile({
        name: res.profile.name ?? "",
        address: res.profile.address ?? "",
        city: res.profile.city ?? "",
        phone: "",
      });
      // Build hours state — default each day to center default
      const defaultHours = (res.hours as any).default ?? { open: "10:00", close: "02:00" };
      const h: Record<string, { open: string; close: string }> = {};
      for (const day of DAYS) {
        h[day] = (res.hours as any)[day] ?? { ...defaultHours };
      }
      setHours(h);
      setCancellation({
        freeCancelMinutes: res.cancellation.freeCancelMinutes ?? 60,
        penaltyPercent: res.cancellation.penaltyPercent ?? 50,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSection = async (section: string, body: unknown) => {
    setSavingSection(section);
    try {
      await apiFetch(`/admin/settings/${section}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div>
        <header className="mb-8">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-th-text-tertiary">
            Settings Surface
          </div>
          <h1 className="font-display text-3xl">Club Settings</h1>
          <p className="mt-2 text-th-text-secondary">Center configuration, hours, pricing, and policies.</p>
        </header>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-th-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className="mb-8">
          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-th-text-tertiary">
            Settings Surface
          </div>
          <h1 className="font-display text-3xl">Club Settings</h1>
        </header>
        <div className="rounded-card border border-th-divider bg-th-card p-8 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchSettings(); }}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-th-text-tertiary">
          Settings Surface
        </div>
        <h1 className="font-display text-3xl">Club Settings</h1>
        <p className="mt-2 text-th-text-secondary">Center configuration, hours, pricing, and policies.</p>
      </header>

      <div className="space-y-6">
        {/* Center Info */}
        <SectionCard
          title="Center Info"
          saving={savingSection === "profile"}
          onSave={() =>
            saveSection("profile", {
              name: profile.name,
              address: profile.address,
              city: profile.city,
            })
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Display Name" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} />
            <InputField label="City" value={profile.city} onChange={(v) => setProfile((p) => ({ ...p, city: v }))} />
            <div className="col-span-2">
              <InputField label="Address" value={profile.address} onChange={(v) => setProfile((p) => ({ ...p, address: v }))} />
            </div>
          </div>
        </SectionCard>

        {/* Opening Hours */}
        <SectionCard
          title="Opening Hours"
          saving={savingSection === "hours"}
          onSave={() => saveSection("hours", hours)}
        >
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm text-th-text-secondary">{day}</span>
                <input
                  type="time"
                  value={hours[day]?.open ?? "10:00"}
                  onChange={(e) =>
                    setHours((h) => ({
                      ...h,
                      [day]: { open: e.target.value, close: h[day]?.close ?? "02:00" },
                    }))
                  }
                  className="rounded-input border border-th-divider bg-th-bg px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-gold"
                />
                <span className="text-th-text-tertiary">to</span>
                <input
                  type="time"
                  value={hours[day]?.close ?? "02:00"}
                  onChange={(e) =>
                    setHours((h) => ({
                      ...h,
                      [day]: { open: h[day]?.open ?? "10:00", close: e.target.value },
                    }))
                  }
                  className="rounded-input border border-th-divider bg-th-bg px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-gold"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Cancellation Policy */}
        <SectionCard
          title="Cancellation Policy"
          saving={savingSection === "cancellation"}
          onSave={() => saveSection("cancellation", cancellation)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-th-text-tertiary">Free Cancel Window (minutes)</label>
              <input
                type="number"
                min={0}
                value={cancellation.freeCancelMinutes}
                onChange={(e) =>
                  setCancellation((c) => ({ ...c, freeCancelMinutes: Number(e.target.value) }))
                }
                className="w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-th-text-tertiary">Penalty (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={cancellation.penaltyPercent}
                onChange={(e) =>
                  setCancellation((c) => ({ ...c, penaltyPercent: Number(e.target.value) }))
                }
                className="w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              />
            </div>
          </div>
        </SectionCard>

        {/* Table Pricing — placeholder since pricing structure varies */}
        <SectionCard
          title="Table Pricing"
          saving={savingSection === "pricing"}
          onSave={() => saveSection("pricing", data?.pricing ?? {})}
        >
          <p className="text-sm text-th-text-tertiary">
            Per-table hourly rates can be edited from the Tables page. Advanced pricing rules coming soon.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
