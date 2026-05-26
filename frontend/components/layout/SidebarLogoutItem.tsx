"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { SidebarIcon } from "@/components/layout/SidebarIcon";
import { NAV_SIDEBAR_ACTION_CLASS } from "@/components/layout/navControlStyles";

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export function SidebarLogoutItem({ className = "", onNavigate }: Props) {
  const router = useRouter();
  const { t } = useI18n();

  const handleLogout = async () => {
    onNavigate?.();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={`${NAV_SIDEBAR_ACTION_CLASS} ${className}`}
    >
      <SidebarIcon name="logout" variant="danger" />
      {t("nav.logout")}
    </button>
  );
}
