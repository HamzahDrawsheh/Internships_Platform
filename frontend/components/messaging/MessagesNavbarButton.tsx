"use client";

import { useEffect, useState } from "react";
import { useMessagesDrawer } from "@/context/MessagesDrawerContext";
import { SidebarIcon } from "@/components/layout/SidebarIcon";
import { NAV_ICON_BUTTON_CLASS } from "@/components/layout/navControlStyles";
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
      className={`relative ${NAV_ICON_BUTTON_CLASS}`}
      title={t("nav.messages")}
      aria-label={`${t("nav.messages")} — chat with people`}
    >
      <SidebarIcon name="message" />
      <span className="hidden md:inline">{t("nav.messages")}</span>
    </button>
  );
}
