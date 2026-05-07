"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextValue {
  dateRange: string;
  setDateRange: (range: string) => void;
  isBookingOpen: boolean;
  setIsBookingOpen: (open: boolean) => void;
  isActivityOpen: boolean;
  setIsActivityOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState("Today");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  return (
    <AdminContext.Provider 
      value={{ 
        dateRange, 
        setDateRange, 
        isBookingOpen, 
        setIsBookingOpen, 
        isActivityOpen, 
        setIsActivityOpen 
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
