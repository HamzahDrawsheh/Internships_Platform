"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export const NAVBAR_SIDEBAR_TOGGLE_SLOT_ID = "navbar-sidebar-toggle-slot";

type Props = {
  open: boolean;
  onToggle: () => void;
};

function ToggleButton({ open, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      aria-expanded={open}
      aria-controls="role-sidebar"
      aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

export function SidebarTogglePortal({ open, onToggle }: Props) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(NAVBAR_SIDEBAR_TOGGLE_SLOT_ID));
  }, []);

  if (!slot) return null;

  return createPortal(<ToggleButton open={open} onToggle={onToggle} />, slot);
}
