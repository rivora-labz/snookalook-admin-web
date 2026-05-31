"use client";

import { useState, useEffect } from "react";
import { useFocusTrap } from "../lib/use-focus-trap";
import { apiFetch, ApiError } from "../lib/api";

type TableTypeOpt = "SNOOKER" | "POOL" | "BILLIARDS";

export interface EditableTable {
  id: string;
  tableNumber: number;
  type: TableTypeOpt;
  hourlyRate?: number | null;
  pricePerHourFils?: number | null;
}

interface Props {
  open: boolean;
  table: EditableTable | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTableModal({ open, table, onClose, onSaved }: Props) {
  const [tableNumber, setTableNumber] = useState("");
  const [type, setType] = useState<TableTypeOpt>("SNOOKER");
  const [priceAed, setPriceAed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editGap, setEditGap] = useState(false);
  const [deleteGap, setDeleteGap] = useState(false);

  useEffect(() => {
    if (!open || !table) return;
    setTableNumber(String(table.tableNumber));
    setType(table.type);
    const fils = table.pricePerHourFils ?? table.hourlyRate ?? 0;
    setPriceAed(fils > 0 ? (fils / 100).toFixed(2) : "");
    setSubmitting(false);
    setDeleting(false);
    setConfirmDelete(false);
    setError(null);
    setEditGap(false);
    setDeleteGap(false);
  }, [open, table]);

  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open || !table) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEditGap(false);

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
    const fils = Math.round(aed * 100);

    setSubmitting(true);
    try {
      await apiFetch(`/admin/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tableNumber: num,
          type,
          pricePerHourFils: fils,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setEditGap(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to save table.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async () => {
    setError(null);
    setDeleteGap(false);
    setDeleting(true);
    try {
      await apiFetch(`/admin/tables/${table.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setDeleteGap(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete table.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-table-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-card border border-th-divider bg-th-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 id="edit-table-title" className="font-display text-xl text-th-text">
            Edit Table #{table.tableNumber}
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

        {editGap && (
          <div className="mb-4 rounded-button border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-xs text-[#F39C12]">
            Backend PATCH <code>/v1/admin/tables/:id</code> rejected the update (likely the
            <code> pricePerHourFils</code> column not yet shipped). Founder gap.
          </div>
        )}

        {deleteGap && (
          <div className="mb-4 rounded-button border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-xs text-[#F39C12]">
            Backend DELETE <code>/v1/admin/tables/:id</code> not yet implemented. Founder gap —
            delete endpoint pending.
          </div>
        )}

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
              className="rounded-button border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
            />
          </label>

          {error && <p className="text-xs text-[#E74C3C]">{error}</p>}

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-button border border-[#E74C3C]/40 px-3 py-2 text-xs text-[#E74C3C] hover:bg-[#E74C3C]/10"
            >
              Delete
            </button>
            <div className="flex gap-2">
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
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setConfirmDelete(false)}
          >
            <div
              className="w-full max-w-sm rounded-card border border-[#E74C3C]/40 bg-th-card p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg text-th-text">Delete table #{table.tableNumber}?</h3>
              <p className="mt-2 text-xs text-th-text-secondary">
                Permanent. Existing bookings on this table may break. Confirm only if you intended
                this.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:text-th-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={doDelete}
                  className="rounded-button bg-[#E74C3C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
