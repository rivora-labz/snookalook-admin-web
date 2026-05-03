"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  className = "", 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-inter font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg";
  
  const variants = {
    primary: "bg-th-gold hover:bg-[#F7D774] text-black shadow-lg shadow-th-gold/10",
    secondary: "bg-th-card border border-th-border-medium hover:bg-th-hover text-th-text",
    ghost: "hover:bg-th-hover text-th-text-secondary hover:text-th-text",
    danger: "bg-[#E74C3C] hover:bg-[#C0392B] text-white",
  };

  const sizes = {
    sm: "px-3 h-8 text-[12px]",
    md: "px-4 h-9 text-[13px]",
    lg: "px-6 h-11 text-[14px]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
