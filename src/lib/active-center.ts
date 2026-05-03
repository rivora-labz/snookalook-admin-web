"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { useStaffSession } from "./use-staff-session";

export const ACTIVE_CENTER_KEY = "adminweb.activeCenterId";
export const ACTIVE_CENTER_PARAM = "centerId";

export interface StaffMembership {
  centerId: string;
  centerName: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

interface MembershipsResponse {
  memberships: StaffMembership[];
}

let membershipsCache: StaffMembership[] | null = null;
let membershipsInflight: Promise<StaffMembership[] | null> | null = null;

function fetchMemberships(): Promise<StaffMembership[] | null> {
  if (membershipsCache) return Promise.resolve(membershipsCache);
  if (!membershipsInflight) {
    membershipsInflight = apiFetch<MembershipsResponse>("/staff/memberships")
      .then((r) => {
        membershipsCache = r.memberships;
        return membershipsCache;
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          membershipsCache = null;
          return null;
        }
        membershipsInflight = null;
        return null;
      });
  }
  return membershipsInflight;
}

export function useStaffMemberships(): { memberships: StaffMembership[] | null; loading: boolean } {
  const [memberships, setMemberships] = useState<StaffMembership[] | null>(membershipsCache);
  const [loading, setLoading] = useState(membershipsCache === null);
  useEffect(() => {
    if (membershipsCache !== null) {
      setMemberships(membershipsCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMemberships().then((m) => {
      if (cancelled) return;
      setMemberships(m);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { memberships, loading };
}

/**
 * Resolves active centerId via URL > sessionStorage > primary (staff session centerId).
 * Returns null while staff session loads.
 */
export function useActiveCenterId(): string | null {
  const { session } = useStaffSession();

  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let urlCenterId: string | null = null;
    try {
      urlCenterId = new URLSearchParams(window.location.search).get(ACTIVE_CENTER_PARAM);
    } catch {
      urlCenterId = null;
    }
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(ACTIVE_CENTER_KEY);
    } catch {
      stored = null;
    }
    setResolved(urlCenterId ?? stored ?? null);
  }, []);

  return resolved ?? session?.centerId ?? null;
}

export function persistActiveCenterId(centerId: string) {
  try {
    sessionStorage.setItem(ACTIVE_CENTER_KEY, centerId);
  } catch {
    // private mode / quota — silent
  }
}
