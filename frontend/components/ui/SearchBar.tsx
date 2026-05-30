"use client";

import { IconMagnifyingGlass } from "@/components/layout/icons";
import { useI18n } from "@/lib/i18n/context";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search…", className = "" }: SearchBarProps) {
  const { lt, t } = useI18n();

  return (
    <div className={`group relative ${className}`}>
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7C3AED] transition-colors duration-300 group-focus-within:text-[#6D28D9] dark:text-violet-400 dark:group-focus-within:text-violet-300"
        aria-hidden
      >
        <IconMagnifyingGlass />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={lt(placeholder)}
        className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-[#0F172A] placeholder:text-[#0F172A]/50 transition-colors duration-300 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400"
        aria-label={t("common.search")}
      />
    </div>
  );
}
