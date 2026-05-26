"use client";

import { type ButtonHTMLAttributes } from "react";
import { useI18n } from "@/lib/i18n/context";

type Variant = "primary" | "secondary" | "danger" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#7C3AED] text-white hover:bg-[#6D28D9] border-transparent shadow-md",
  secondary: "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
  link: "bg-transparent text-[#0F172A] underline hover:text-[#7C3AED] border-transparent dark:text-slate-200",
};

function localizeChild(child: React.ReactNode, lt: (text: string) => string): React.ReactNode {
  if (typeof child === "string") return lt(child);
  return child;
}

export function Button({ variant = "primary", className = "", type = "button", children, ...props }: ButtonProps) {
  const { lt } = useI18n();
  const base = "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-slate-900";
  const variantClass = variants[variant];
  const linkClass = variant === "link" ? "px-0 py-0 min-h-0" : "";
  return (
    <button type={type} className={`${base} ${variantClass} ${linkClass} ${className}`} {...props}>
      {localizeChild(children, lt)}
    </button>
  );
}
