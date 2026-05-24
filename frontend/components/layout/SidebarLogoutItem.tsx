"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

type Props = {
  icon?: string;
  className?: string;
  onNavigate?: () => void;
};

export function SidebarLogoutItem({ icon = "🚪", className = "", onNavigate }: Props) {
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
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 transition-all duration-300 hover:bg-red-50 hover:text-red-700 dark:text-gray-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 ${className}`}
    >
      <span className="text-base" aria-hidden>
        {icon}
      </span>
      {t("nav.logout")}
    </button>
  );
}
