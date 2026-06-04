"use client";

import { type ButtonHTMLAttributes } from "react";
import {
  BTN_BRAND_GLOW,
  btnAssistantGradientClass,
  btnPrimaryGradientClass,
} from "@/lib/ui/button-variants";
import { useI18n } from "@/lib/i18n/context";

type Variant = "primary" | "assistant" | "secondary" | "danger" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  /** Subtle lift + glow on primary actions (auth, main CTAs). */
  glow?: boolean;
}

const variants: Record<Variant, string> = {
  primary: btnPrimaryGradientClass,
  assistant: btnAssistantGradientClass,
  secondary:
    "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
  link: "bg-transparent text-[#0F172A] underline hover:text-[#7C3AED] border-transparent dark:text-slate-200",
};

function localizeChild(child: React.ReactNode, lt: (text: string) => string): React.ReactNode {
  if (typeof child === "string") return lt(child);
  return child;
}

export function Button({
  variant = "primary",
  glow = false,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const { lt } = useI18n();
  const base =
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-slate-900";
  const variantClass = variants[variant];
  const linkClass = variant === "link" ? "px-0 py-0 min-h-0 font-medium" : "";
  const glowClass = glow && variant === "primary" ? BTN_BRAND_GLOW : "";
  return (
    <button
      type={type}
      className={`${base} ${variantClass} ${linkClass} ${glowClass} ${className}`.trim()}
      {...props}
    >
      {localizeChild(children, lt)}
    </button>
  );
}
