"use client";

import { useEffect, useState, useCallback } from "react";
import type { StaffRole } from "@rivora-labz/snook-shared";
import { apiFetch, formatDate } from "../../../lib/api";

interface StaffItem {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    phone: string | null;
  };
  role: StaffRole;
  createdAt: string;
}

const ROLE_COLOR: Record<StaffRole, { bg: string; text: string }> = {
  OWNER: { bg: "#D4AF37", text: "#111" },
  MANAGER: { bg: "#3498DB", text: "#fff" },
  STAFF: { bg: "#2A2A2A", text: "#B0B0B0" },
};

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export default function TeamPage() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>("STAFF");
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: StaffItem[] }>("/admin/team");
      setStaff(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleAdd = async () => {
    if (!formUserId.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/admin/team", {
        method: "POST",
        body: JSON.stringify({ userId: formUserId.trim(), role: formRole }),
      });
      setShowModal(false);
      setFormUserId("");
      setFormRole("STAFF");
      await fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await apiFetch(`/admin/team/${id}`, { method: "DELETE" });
      await fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove staff");
    }
  };

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-th-text">Team</h1>
          <p className="mt-1 text-th-text-secondary">Manage staff members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
        >
          + Add Staff
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-card border border-th-divider bg-th-card p-6 text-center">
          <p className="text-[#E74C3C]">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchTeam(); }}
            className="mt-3 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-card border border-th-divider bg-th-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-th-divider" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-th-text-tertiary">No team members found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-th-divider text-left text-xs text-th-text-tertiary">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Phone</th>
                <th className="px-5 py-2.5 font-medium">Since</th>
                <th className="px-5 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-th-divider/50 last:border-b-0">
                  <td className="px-5 py-3 text-th-text">{s.user.displayName}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block rounded-pill px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: ROLE_COLOR[s.role].bg, color: ROLE_COLOR[s.role].text }}
                    >
                      {ROLE_LABEL[s.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-th-text-secondary">{s.user.email ?? "—"}</td>
                  <td className="px-5 py-3 text-th-text-secondary">{s.user.phone ?? "—"}</td>
                  <td className="px-5 py-3 text-th-text-secondary">{formatDate(s.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(s.id, s.user.displayName)}
                      className="text-xs text-[#E74C3C] hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-card border border-th-divider bg-th-card p-6">
            <h3 className="mb-4 font-display text-lg text-th-text">Add Staff Member</h3>

            <label className="mb-1 block text-xs text-th-text-secondary">User ID</label>
            <input
              type="text"
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              placeholder="UUID of existing user"
              className="mb-4 w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-text-tertiary outline-none focus:border-th-gold"
            />

            <label className="mb-1 block text-xs text-th-text-secondary">Role</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as StaffRole)}
              className="mb-6 w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
            >
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:bg-th-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting || !formUserId.trim()}
                className="flex-1 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
