"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Drawer from "../../../components/Drawer";
import { apiFetch, ApiError } from "../../../lib/api";

interface FormState {
  name: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  hoursOpen: string;
  hoursClose: string;
  priceMinAed: string;
  priceMaxAed: string;
  heroImage: string;
  isFeatured: boolean;
}

const EMPTY: FormState = {
  name: "",
  city: "",
  address: "",
  lat: "",
  lng: "",
  hoursOpen: "14:00",
  hoursClose: "02:00",
  priceMinAed: "",
  priceMaxAed: "",
  heroImage: "",
  isFeatured: false,
};

const HH_MM = /^\d{2}:\d{2}$/;

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-inter text-[11px] font-semibold uppercase tracking-[0.07em] text-th-text-tertiary"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-th-bg border border-th-border rounded-[10px] px-3 h-[40px] text-[14px] text-th-text font-inter focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_0_2px_rgba(212,175,55,0.2)] transition-all placeholder:text-th-text-tertiary";

export default function CreateCenterButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idName = useId();
  const idCity = useId();
  const idAddress = useId();
  const idLat = useId();
  const idLng = useId();
  const idOpen = useId();
  const idClose = useId();
  const idPriceMin = useId();
  const idPriceMax = useId();
  const idHeroImage = useId();
  const idFeatured = useId();

  const set = (k: keyof FormState) => (v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  function closeDrawer() {
    setOpen(false);
    setForm(EMPTY);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const priceMin = Math.round(parseFloat(form.priceMinAed) * 100);
    const priceMax = Math.round(parseFloat(form.priceMaxAed) * 100);

    if (!form.name.trim()) { setError("Club name is required."); return; }
    if (!form.city.trim()) { setError("City is required."); return; }
    if (!form.address.trim()) { setError("Address is required."); return; }
    if (!Number.isFinite(lat)) { setError("Latitude must be a number."); return; }
    if (!Number.isFinite(lng)) { setError("Longitude must be a number."); return; }
    if (!HH_MM.test(form.hoursOpen)) { setError("Open time must be HH:MM."); return; }
    if (!HH_MM.test(form.hoursClose)) { setError("Close time must be HH:MM."); return; }
    if (!Number.isFinite(priceMin) || priceMin < 0) { setError("Min price must be ≥ 0 AED."); return; }
    if (!Number.isFinite(priceMax) || priceMax < 0) { setError("Max price must be ≥ 0 AED."); return; }
    if (priceMin > priceMax) { setError("Min price must be ≤ max price."); return; }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      lat,
      lng,
      hoursOpen: form.hoursOpen,
      hoursClose: form.hoursClose,
      priceMin,
      priceMax,
      isFeatured: form.isFeatured,
    };
    if (form.heroImage.trim()) body.heroImage = form.heroImage.trim();

    setSubmitting(true);
    try {
      await apiFetch("/admin/system/centers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      closeDrawer();
      toast.success("Center created");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to create center.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-[36px] px-4 bg-[#D4AF37] hover:bg-[#F7D774] text-black font-inter text-[13px] font-semibold rounded-[10px] transition-colors"
      >
        + New Center
      </button>

      <Drawer isOpen={open} onClose={closeDrawer} title="New Center" width="480px">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Field label="Club Name *" id={idName}>
            <input
              id={idName}
              type="text"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Snooker Palace"
              className={inputCls}
            />
          </Field>

          <Field label="City *" id={idCity}>
            <input
              id={idCity}
              type="text"
              value={form.city}
              onChange={(e) => set("city")(e.target.value)}
              placeholder="e.g. Dubai"
              className={inputCls}
            />
          </Field>

          <Field label="Address *" id={idAddress}>
            <input
              id={idAddress}
              type="text"
              value={form.address}
              onChange={(e) => set("address")(e.target.value)}
              placeholder="Street, district"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude *" id={idLat}>
              <input
                id={idLat}
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => set("lat")(e.target.value)}
                placeholder="25.2048"
                className={inputCls}
              />
            </Field>
            <Field label="Longitude *" id={idLng}>
              <input
                id={idLng}
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => set("lng")(e.target.value)}
                placeholder="55.2708"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens (HH:MM) *" id={idOpen}>
              <input
                id={idOpen}
                type="time"
                value={form.hoursOpen}
                onChange={(e) => set("hoursOpen")(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Closes (HH:MM) *" id={idClose}>
              <input
                id={idClose}
                type="time"
                value={form.hoursClose}
                onChange={(e) => set("hoursClose")(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Price (AED) *" id={idPriceMin}>
              <input
                id={idPriceMin}
                type="number"
                min="0"
                step="1"
                value={form.priceMinAed}
                onChange={(e) => set("priceMinAed")(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </Field>
            <Field label="Max Price (AED) *" id={idPriceMax}>
              <input
                id={idPriceMax}
                type="number"
                min="0"
                step="1"
                value={form.priceMaxAed}
                onChange={(e) => set("priceMaxAed")(e.target.value)}
                placeholder="100"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Hero Image URL" id={idHeroImage}>
            <input
              id={idHeroImage}
              type="url"
              value={form.heroImage}
              onChange={(e) => set("heroImage")(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>

          <label htmlFor={idFeatured} className="flex items-center gap-3 cursor-pointer">
            <input
              id={idFeatured}
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => set("isFeatured")(e.target.checked)}
              className="w-4 h-4 accent-[#D4AF37]"
            />
            <span className="font-inter text-[13px] text-th-text">Feature this center on the app</span>
          </label>

          {error && (
            <div role="alert" className="font-inter text-[13px] text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-[10px] px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className={`mt-2 h-[42px] rounded-[10px] font-inter text-[14px] font-semibold bg-[#D4AF37] text-black transition-colors ${
              submitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#F7D774]"
            }`}
          >
            {submitting ? "Creating…" : "Create Center"}
          </button>
        </form>
      </Drawer>
    </>
  );
}
