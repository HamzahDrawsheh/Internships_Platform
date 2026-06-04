"use client";

import { useI18n } from "@/lib/i18n/context";
import { useLogoutConfirm } from "@/components/auth/LogoutConfirmProvider";
import { SidebarIcon } from "@/components/layout/SidebarIcon";
import { NAV_SIDEBAR_ACTION_CLASS } from "@/components/layout/navControlStyles";

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export function SidebarLogoutItem({ className = "", onNavigate }: Props) {
  const { t } = useI18n();
  const { requestLogout } = useLogoutConfirm();

  return (
    <button
      type="button"
      onClick={() => requestLogout({ beforeSignOut: onNavigate })}
      className={`${NAV_SIDEBAR_ACTION_CLASS} ${className}`}
    >
      <SidebarIcon name="logout" variant="danger" />
      {t("nav.logout")}
    </button>
  );
}
