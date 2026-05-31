"use client";

import { ReactNode, useEffect, useId } from "react";
import { X } from "phosphor-react";
import { useFocusTrap } from "../lib/use-focus-trap";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "420px"
}: DrawerProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const titleId = useId();

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed top-0 right-0 h-full bg-th-bg border-l border-th-divider z-[101] shadow-2xl transition-transform duration-300 ease-out flex flex-col`}
        style={{
          width,
          transform: isOpen ? "translateX(0)" : "translateX(100%)"
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-th-divider">
          <h2 id={titleId} className="font-display text-[20px] font-bold text-th-text">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-th-text-tertiary hover:text-th-text hover:bg-th-hover rounded-full transition-all"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}
