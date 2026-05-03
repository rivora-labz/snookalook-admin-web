"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  MagnifyingGlass, 
  Calendar, 
  Bell, 
  CaretDown, 
  Check 
} from "phosphor-react";
import ThemeToggle from "./ThemeToggle";
import Button from "./Button";
import { useAdmin } from "../lib/AdminContext";

const DATE_OPTIONS = [
  "Today, 20 April",
  "Yesterday, 19 April",
  "Last 7 days",
  "Last 30 days",
  "This month",
];

export default function AdminHeader() {
  const pathname = usePathname();
  const { 
    dateRange, 
    setDateRange, 
    setIsBookingOpen, 
    setIsActivityOpen 
  } = useAdmin();
  
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
        setIsCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === "/") return "Floor Management";
    if (pathname.includes("/dashboard")) return "Performance Dashboard";
    if (pathname.includes("/tables")) return "Tables & Assets";
    if (pathname.includes("/bookings")) return "Booking Management";
    if (pathname.includes("/players")) return "Player Roster";
    if (pathname.includes("/disputes")) return "Dispute Center";
    if (pathname.includes("/earnings")) return "Revenue & Earnings";
    if (pathname.includes("/settings")) return "Global Settings";
    return "Admin Panel";
  };

  return (
    <header className="h-[80px] border-b border-th-divider flex items-center justify-between px-8 bg-th-bg sticky top-0 z-40">
      <div>
        <h1 className="font-display text-[22px] font-bold text-th-text tracking-tight">{getPageTitle()}</h1>
        <p className="font-inter text-[12px] text-th-text-tertiary mt-0.5">Welcome back, manager.</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Selector */}
        <div className="relative" ref={dateMenuRef}>
          <button 
            onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
            className="flex items-center gap-2.5 px-3.5 h-[36px] bg-th-card border border-th-border-medium rounded-lg hover:bg-th-hover transition-colors group"
          >
            <Calendar size={16} className="text-th-gold" />
            <span className="font-inter text-[13px] font-semibold text-th-text">{dateRange}</span>
            <CaretDown size={14} className={`text-th-text-tertiary transition-transform duration-200 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDateMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[200px] bg-th-card border border-th-divider rounded-xl py-1.5 shadow-xl z-50 overflow-hidden">
              {DATE_OPTIONS.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setDateRange(item);
                    setIsDateMenuOpen(false);
                  }}
                  className="w-full h-[36px] px-4 flex items-center justify-between font-inter text-[13px] font-medium text-th-text hover:bg-th-hover transition-colors text-left"
                >
                  {item}
                  {dateRange === item && <Check size={14} className="text-th-gold" />}
                </button>
              ))}
              <div className="h-[1px] bg-th-divider my-1.5" />
              <button
                onClick={() => {
                  setIsDateMenuOpen(false);
                  setIsCustomOpen(true);
                }}
                className="w-full h-[36px] px-4 flex items-center justify-between font-inter text-[13px] font-medium text-th-text hover:bg-th-hover transition-colors text-left"
              >
                Custom range...
                {dateRange.includes(" - ") && <Check size={14} className="text-th-gold" />}
              </button>
            </div>
          )}

          {isCustomOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[280px] bg-th-card border border-th-divider rounded-xl p-4 shadow-xl z-50">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider font-bold">From</label>
                  <input type="date" className="bg-th-elevated border border-th-border-medium rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-th-gold transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-inter text-[11px] text-th-text-tertiary uppercase tracking-wider font-bold">To</label>
                  <input type="date" className="bg-th-elevated border border-th-border-medium rounded-lg px-3 py-2 text-[13px] text-th-text focus:outline-none focus:border-th-gold transition-colors" />
                </div>
                <Button onClick={() => setIsCustomOpen(false)} className="w-full mt-1">
                  Apply Range
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search */}
        <div className="relative w-[280px] hidden xl:block">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-th-text-tertiary">
            <MagnifyingGlass size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Search bookings, players..." 
            className="w-full h-[36px] bg-th-card border border-th-border-medium rounded-lg pl-9 pr-4 text-[13px] text-th-text placeholder-th-text-tertiary focus:outline-none focus:border-th-gold transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 border-l border-th-divider pl-4 ml-1">
          <ThemeToggle />
          
          <button 
            onClick={() => setIsActivityOpen(true)}
            className="relative p-2 text-th-text-tertiary hover:text-th-text transition-colors"
          >
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-th-gold rounded-full border-2 border-th-bg"></div>
          </button>
        </div>

        <Button 
          onClick={() => setIsBookingOpen(true)}
          className="ml-2"
        >
          + New Booking
        </Button>
      </div>
    </header>
  );
}
