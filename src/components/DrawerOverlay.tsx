"use client";

interface DrawerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DrawerOverlay({ isOpen, onClose }: DrawerOverlayProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-[var(--th-overlay)] backdrop-blur-sm"
      onClick={onClose}
    />
  );
}
