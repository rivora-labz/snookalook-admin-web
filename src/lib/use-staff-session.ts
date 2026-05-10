"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export type StaffRole = "OWNER" | "MANAGER" | "STAFF";
export type StaffSession = {
  role: StaffRole;
  userId: string;
  userDisplayName: string;
  centerId: string;
  centerName: string;
};

let cache: StaffSession | null = null;
let inflight: Promise<StaffSession> | null = null;

interface StaffMeResponse {
  staffMember: {
    role: StaffRole;
    centerId: string;
    centerName: string;
    user: { id: string; displayName: string };
  };
}

function fetchStaffSession(): Promise<StaffSession> {
  if (!inflight) {
    inflight = apiFetch<StaffMeResponse>("/staff/me").then((r) => {
      cache = {
        role: r.staffMember.role,
        userId: r.staffMember.user.id,
        userDisplayName: r.staffMember.user.displayName,
        centerId: r.staffMember.centerId,
        centerName: r.staffMember.centerName,
      };
      return cache;
    });
  }
  return inflight;
}

export function useStaffSession() {
  const [session, setSession] = useState<StaffSession | null>(cache);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    if (cache) {
      setSession(cache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchStaffSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { session, loading };
}
