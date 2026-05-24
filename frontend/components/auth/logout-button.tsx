"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useI18n();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <Button type="button" variant="secondary" onClick={handleLogout} className="transition-colors duration-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
      {t("nav.logout")}
    </Button>
  );
}
