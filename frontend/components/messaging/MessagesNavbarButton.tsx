"use client";

import { useEffect, useState } from "react";
import { useMessagesDrawer } from "@/context/MessagesDrawerContext";
import { useI18n } from "@/lib/i18n/context";
import type { MessagingViewerRole } from "@/lib/messaging";
import { createClient } from "@/lib/supabase/client";

type Props = {
  enabled: boolean;
};

export function MessagesNavbarButton({ enabled }: Props) {
  const { t } = useI18n();
  const { openDrawer, setViewerRole } = useMessagesDrawer();
  const [messagingRole, setMessagingRole] = useState<MessagingViewerRole | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessagingRole(null);
        setViewerRole(null);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = profile?.role;
      if (role === "student" || role === "supervisor" || role === "company") {
        setMessagingRole(role);
        setViewerRole(role);
      } else {
        setMessagingRole(null);
        setViewerRole(null);
      }
    })();
    return () => {
      setViewerRole(null);
    };
  }, [enabled, setViewerRole]);

  if (!enabled || !messagingRole) return null;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      title={t("nav.messages")}
      aria-label={`${t("nav.messages")} — chat with people`}
    >
      <span className="text-base" aria-hidden>
        💬
      </span>
      <span className="hidden md:inline">{t("nav.messages")}</span>
    </button>
  );
}
