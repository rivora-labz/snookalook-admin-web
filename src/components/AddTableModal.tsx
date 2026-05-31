"use client";

import { useState, useEffect } from "react";
import { useFocusTrap } from "../lib/use-focus-trap";
import { apiFetch, ApiError } from "../lib/api";

type TableTypeOpt = "SNOOKER" | "POOL" | "BILLIARDS";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddTableModal({ open, onClose, onCreated }: Props) {
  const [tableNumber, setTableNumber] = useState("");
  const [type, setType] = useState<TableTypeOpt>("SNOOKER");
  const [priceAed, setPriceAed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendGap, setBackendGap] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTableNumber("");
    setType("SNOOKER");
    setPriceAed("");
    setSubmitting(false);
    setError(null);
    setBackendGap(false);
  }, [open]);

  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBackendGap(false);

    const num = parseInt(tableNumber, 10);
    if (!Number.isInteger(num) || num <= 0) {
      setError("Table number must be a positive integer.");
      return;
    }
    const aed = parseFloat(priceAed);
    if (!Number.isFinite(aed) || aed <= 0) {
      setError("Price must be a positive AED amount.");
      return;
    }
    const pricePerHourFils = Math.round(aed * 100);

    setSubmitting(true);
    try {
      await apiFetch("/admin/tables", {
        method: "POST",
        body: JSON.stringify({ tableNumber: num, type, pricePerHourFils }),
      });
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setBackendGap(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to create table.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-table-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-card border border-th-divider bg-th-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 id="add-table-title" className="font-display text-xl text-th-text">
            Add Table
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-th-text-tertiary hover:text-th-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {backendGap ? (
          <div className="rounded-button border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-xs text-[#F39C12]">
            Backend POST <code>/v1/admin/tables</code> not yet implemented. Founder gap — table
            create endpoint pending. Seed via <code>pnpm db:seed</code> for now.
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-th-text-secondary">Table number</span>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="rounded-button border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-th-text-secondary">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TableTypeOpt)}
                className="rounded-button border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              >
                <option value="SNOOKER">Snooker</option>
                <option value="POOL">Pool</option>
                <option value="BILLIARDS">Billiards</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-th-text-secondary">Price per hour (AED)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={priceAed}
                onChange={(e) => setPriceAed(e.target.value)}
                placeholder="e.g. 75.00"
                className="rounded-button border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
              />
            </label>

            {error && <p className="text-xs text-[#E74C3C]">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:text-th-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
