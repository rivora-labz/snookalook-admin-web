"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { CenterPhoto } from "@rivora-labz/snook-shared";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCenterPhotos } from "../../../../hooks/useCenterPhotos";

const MAX_PHOTOS = 12;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-card border border-[#E74C3C]/40 bg-th-card px-4 py-3 text-sm text-[#E74C3C] shadow-lg"
    >
      <span>{msg}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-2 text-xs opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

interface SortablePhotoCardProps {
  photo: CenterPhoto;
  uploading?: boolean;
  onDelete: (id: string) => void;
  onCaptionCommit: (id: string, caption: string) => void;
}

function SortablePhotoCard({
  photo,
  uploading,
  onDelete,
  onCaptionCommit,
}: SortablePhotoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(photo.caption ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (photo.caption ?? "")) {
      onCaptionCommit(photo.id, trimmed);
    }
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-video overflow-hidden rounded-card border border-th-divider bg-th-card"
    >
      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-th-card">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-th-divider border-t-th-gold" />
        </div>
      ) : (
        <>
          <Image
            src={photo.url}
            alt={photo.caption ?? `Photo ${photo.displayOrder + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            className="object-cover"
            draggable={false}
          />

          {/* Drag handle top-left */}
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="absolute left-2 top-2 cursor-grab rounded-sm bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 active:cursor-grabbing"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="1.2" fill="currentColor" />
              <circle cx="10" cy="4" r="1.2" fill="currentColor" />
              <circle cx="4" cy="7" r="1.2" fill="currentColor" />
              <circle cx="10" cy="7" r="1.2" fill="currentColor" />
              <circle cx="4" cy="10" r="1.2" fill="currentColor" />
              <circle cx="10" cy="10" r="1.2" fill="currentColor" />
            </svg>
          </button>

          {/* Delete top-right */}
          <button
            onClick={() => onDelete(photo.id)}
            aria-label="Delete photo"
            className="absolute right-2 top-2 rounded-sm bg-black/50 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-[#E74C3C]"
          >
            ×
          </button>

          {/* Caption overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1.5">
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setDraft(photo.caption ?? "");
                    setEditing(false);
                  }
                }}
                placeholder="Add caption…"
                className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setDraft(photo.caption ?? "");
                  setEditing(true);
                }}
                className="w-full text-left text-xs text-white/80 hover:text-white"
                title="Click to edit caption"
              >
                {photo.caption || (
                  <span className="text-white/40 italic">Add caption…</span>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DropzoneCard({
  onFiles,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  onFiles: (files: File[]) => void;
  isDragOver: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload photos"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed transition-colors ${
        isDragOver
          ? "border-th-gold bg-th-gold/5"
          : "border-th-divider hover:border-th-gold/50 hover:bg-th-hover"
      }`}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-th-text-tertiary">
        <path
          d="M14 4v14M8 10l6-6 6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 20v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs text-th-text-secondary">
        Drop or click to upload
      </span>
      <span className="text-[10px] text-th-text-tertiary">JPEG, PNG, WebP · max 8 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            onFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

function EmptyDropzone({
  onFiles,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  onFiles: (files: File[]) => void;
  isDragOver: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload photos"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed py-16 transition-colors ${
        isDragOver
          ? "border-th-gold bg-th-gold/5"
          : "border-th-divider hover:border-th-gold/50 hover:bg-th-hover"
      }`}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-th-text-tertiary">
        <rect x="4" y="10" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="20" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 33l10-8 8 6 8-10 14 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <p className="text-sm font-medium text-th-text">Add photos of your club</p>
        <p className="mt-1 text-xs text-th-text-secondary">
          Players love seeing the space before they book.
        </p>
        <p className="mt-1 text-[10px] text-th-text-tertiary">
          JPEG, PNG, WebP · max 8 MB per photo · up to 12 photos
        </p>
      </div>
      <span className="rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black">
        Upload Photos
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            onFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

export default function CenterPhotosPage() {
  const { photos, loading, error, fetchPhotos, uploadPhoto, updatePhoto, deletePhoto } =
    useCenterPhotos();

  const [sortedPhotos, setSortedPhotos] = useState<CenterPhoto[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    setSortedPhotos(photos);
  }, [photos]);

  const showError = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setSortedPhotos((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });

      setSortedPhotos((prev) => {
        const reordered = prev.map((p, i) => ({ ...p, displayOrder: i }));
        const moved = reordered.find((p) => p.id === active.id);
        if (moved) {
          updatePhoto(moved.id, { displayOrder: moved.displayOrder }).catch((err) =>
            showError(err instanceof Error ? err.message : "Failed to save order"),
          );
        }
        return reordered;
      });
    },
    [updatePhoto, showError],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const remaining = MAX_PHOTOS - sortedPhotos.length;
      const toUpload = files.slice(0, remaining);

      for (const file of toUpload) {
        if (!ACCEPTED_MIME.includes(file.type)) {
          showError(`${file.name}: unsupported type (use JPEG, PNG, or WebP)`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          showError(`${file.name}: exceeds 8 MB limit`);
          continue;
        }

        const tempId = `uploading-${Date.now()}-${Math.random()}`;
        setUploadingIds((prev) => new Set(prev).add(tempId));
        try {
          await uploadPhoto(file);
        } catch (err) {
          showError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
        } finally {
          setUploadingIds((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
          });
        }
      }
    },
    [sortedPhotos.length, uploadPhoto, showError],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this photo?")) return;
      try {
        await deletePhoto(id);
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to delete photo");
      }
    },
    [deletePhoto, showError],
  );

  const handleCaptionCommit = useCallback(
    async (id: string, caption: string) => {
      try {
        await updatePhoto(id, { caption });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to save caption");
      }
    },
    [updatePhoto, showError],
  );

  const atLimit = sortedPhotos.length >= MAX_PHOTOS;

  const handleDragOver: React.DragEventHandler = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave: React.DragEventHandler = () => setIsDragOver(false);
  const handleDrop: React.DragEventHandler = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (atLimit) return;
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">Center Photos</h1>
        <p className="mt-1 text-th-text-secondary">
          Manage photos shown to players when browsing your center.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-card border border-[#E74C3C]/40 bg-[#E74C3C]/10 p-4 text-sm text-[#E74C3C]">
          {error}
          <button
            onClick={fetchPhotos}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {atLimit && (
        <div className="mb-4 rounded-card border border-[#F39C12]/40 bg-[#F39C12]/10 p-3 text-sm text-[#F39C12]">
          Maximum 12 photos reached. Delete a photo to upload a new one.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-card bg-th-card" />
          ))}
        </div>
      ) : sortedPhotos.length === 0 && uploadingIds.size === 0 ? (
        <EmptyDropzone
          onFiles={handleFiles}
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedPhotos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPhotos.map((photo) => (
                <SortablePhotoCard
                  key={photo.id}
                  photo={photo}
                  onDelete={handleDelete}
                  onCaptionCommit={handleCaptionCommit}
                />
              ))}

              {/* Placeholder cards for in-flight uploads */}
              {Array.from(uploadingIds).map((id) => (
                <div
                  key={id}
                  className="flex aspect-video items-center justify-center rounded-card border border-th-divider bg-th-card"
                >
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-th-divider border-t-th-gold" />
                </div>
              ))}

              {/* Dropzone card (visible while below limit) */}
              {!atLimit && (
                <DropzoneCard
                  onFiles={handleFiles}
                  isDragOver={isDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
