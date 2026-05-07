"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlass,
  Calendar,
  Bell,
  CaretDown,
  Check,
  Sun,
  Moon,
} from "phosphor-react";
import Button from "./Button";
import { useAdmin } from "../lib/AdminContext";
import { useTheme } from "../lib/ThemeContext";

const DATE_OPTIONS = ["Today", "Yesterday", "Last 7 days", "Last 30 days"];

export default function AdminHeader() {
  const pathname = usePathname();
  const { dateRange, setDateRange, setIsBookingOpen, setIsActivityOpen } =
    useAdmin();
  const { theme, toggleTheme } = useTheme();

  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateMenuRef.current &&
        !dateMenuRef.current.contains(event.target as Node)
      ) {
        setIsDateMenuOpen(false);
        setIsCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/" || pathname.includes("/tables")) return "Tables";
    if (pathname.includes("/dashboard")) return "Dashboard";
    if (pathname.includes("/bookings")) return "Bookings";
    if (pathname.includes("/analytics") || pathname.includes("/earnings"))
      return "Analytics";
    return "Dashboard";
  };

  return (
    <header className="h-[64px] flex-shrink-0 bg-th-bg border-b border-th-card flex items-center justify-between px-8">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-[18px] font-semibold text-th-text">
          {getPageTitle()}
        </h1>
        <span className="font-inter text-[12px] text-th-text-tertiary">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Dropdown */}
        <div className="relative" ref={dateMenuRef}>
          <button
            onClick={() => {
              setIsDateMenuOpen(!isDateMenuOpen);
              setIsCustomOpen(false);
            }}
            className={`flex items-center justify-between min-w-[140px] max-w-[180px] h-[36px] bg-th-card border rounded-full px-3 transition-colors duration-150 ${
              isDateMenuOpen || isCustomOpen
                ? "border-[#D4AF37]"
                : "border-th-border hover:border-th-border-medium"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-th-text-tertiary" />
              <span className="font-inter text-[13px] font-medium text-th-text truncate">
                {dateRange}
              </span>
            </div>
            <CaretDown
              size={12}
              className={`text-th-text-tertiary transition-transform ${
                isDateMenuOpen || isCustomOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDateMenuOpen && (
            <div className="absolute top-[calc(100%+4px)] right-0 w-[220px] bg-th-input border border-th-border rounded-xl py-1.5 shadow-[var(--th-shadow-modal)] z-50">
              {DATE_OPTIONS.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setDateRange(item);
                    setIsDateMenuOpen(false);
                    setIsCustomOpen(false);
                  }}
                  className="w-full h-[36px] px-3 flex items-center justify-between font-inter text-[13px] font-medium text-th-text hover:bg-[var(--th-hover)] transition-colors"
                >
                  {item}
                  {dateRange === item && (
                    <Check size={12} className="text-[#D4AF37]" />
                  )}
                </button>
              ))}
              <div className="h-[1px] bg-[var(--th-hover)] my-1.5" />
              <button
                onClick={() => {
                  setDateRange("Custom range...");
                  setIsDateMenuOpen(false);
                  setIsCustomOpen(true);
                }}
                className="w-full h-[36px] px-3 flex items-center justify-between font-inter text-[13px] font-medium text-th-text hover:bg-[var(--th-hover)] transition-colors"
              >
                Custom range...
                {dateRange === "Custom range..." && (
                  <Check size={12} className="text-[#D4AF37]" />
                )}
              </button>
            </div>
          )}

          {isCustomOpen && (
            <div className="absolute top-[calc(100%+4px)] right-0 w-[280px] bg-th-card border border-th-divider rounded-xl p-4 shadow-xl z-50">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider">
                    From
                  </label>
                  <input
                    type="date"
                    className="bg-th-elevated border border-th-border-medium rounded px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider">
                    To
                  </label>
                  <input
                    type="date"
                    className="bg-th-elevated border border-th-border-medium rounded px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  onClick={() => setIsCustomOpen(false)}
                  className="w-full mt-1 h-[36px] bg-[#D4AF37] hover:bg-[#F7D774] text-black font-semibold text-[13px] rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search */}
        <div className="relative w-[280px]">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-th-text-tertiary">
            <MagnifyingGlass size={16} />
          </div>
          <input
            type="text"
            placeholder="Search bookings, players, tables..."
            className="w-full h-[36px] bg-th-card border border-th-border-medium rounded-lg pl-9 pr-4 text-[13px] text-th-text placeholder-th-text-tertiary focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 text-th-text-tertiary hover:text-th-text transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Activity Bell */}
        <button
          onClick={() => setIsActivityOpen(true)}
          className="relative p-2 text-th-text-tertiary hover:text-th-text transition-colors"
        >
          <Bell size={20} />
          <div className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full" />
        </button>

        {/* New Booking */}
        <Button onClick={() => setIsBookingOpen(true)} className="ml-2">
          + New Booking
        </Button>
      </div>
    </header>
  );
}
