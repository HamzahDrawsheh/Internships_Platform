"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { NAV_ICON_BUTTON_SQUARE_CLASS } from "@/components/layout/navControlStyles";

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
      className={NAV_ICON_BUTTON_SQUARE_CLASS}
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
    // The portal target exists only after the navbar is mounted in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlot(document.getElementById(NAVBAR_SIDEBAR_TOGGLE_SLOT_ID));
  }, []);

  if (!slot) return null;

  return createPortal(<ToggleButton open={open} onToggle={onToggle} />, slot);
}
