"use client";

import { useState, useCallback } from "react";
import type { CenterPhoto } from "@rivora-labz/snook-shared/types";
import { apiFetch, apiFetchFormData, ApiError } from "../lib/api";

interface UseCenterPhotosReturn {
  photos: CenterPhoto[];
  loading: boolean;
  error: string | null;
  fetchPhotos: () => Promise<void>;
  uploadPhoto: (file: File, caption?: string) => Promise<void>;
  updatePhoto: (id: string, patch: { caption?: string; displayOrder?: number }) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

export function useCenterPhotos(): UseCenterPhotosReturn {
  const [photos, setPhotos] = useState<CenterPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: CenterPhoto[] }>("/admin/centers/me/photos");
      setPhotos(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(async (file: File, caption?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    const photo = await apiFetchFormData<CenterPhoto>("/admin/centers/me/photos", form);
    setPhotos((prev) => [...prev, photo]);
  }, []);

  const updatePhoto = useCallback(
    async (id: string, patch: { caption?: string; displayOrder?: number }) => {
      const updated = await apiFetch<CenterPhoto>(`/admin/centers/me/photos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPhotos((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [],
  );

  const deletePhoto = useCallback(async (id: string) => {
    await apiFetch(`/admin/centers/me/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { photos, loading, error, fetchPhotos, uploadPhoto, updatePhoto, deletePhoto };
}
