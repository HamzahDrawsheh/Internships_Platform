"use client";

import { Button } from "@/components/ui";
import { useLogoutConfirm } from "@/components/auth/LogoutConfirmProvider";
import { useI18n } from "@/lib/i18n/context";

export function LogoutButton() {
  const { t } = useI18n();
  const { requestLogout } = useLogoutConfirm();

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => requestLogout()}
      className="transition-colors duration-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
    >
      {t("nav.logout")}
    </Button>
  );
}
