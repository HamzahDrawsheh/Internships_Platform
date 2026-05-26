"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMessagesDrawer, type MessageChatTarget } from "@/context/MessagesDrawerContext";
import { messagesInboxPath, type DmConversationKind, type MessagingViewerRole } from "@/lib/messaging";
import { createClient } from "@/lib/supabase/client";

export function useMessagingActions() {
  const drawer = useMessagesDrawer();
  const router = useRouter();
  const [viewerRole, setViewerRoleState] = useState<MessagingViewerRole | null>(null);
  const [viewerName, setViewerName] = useState<string | undefined>();

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setViewerRoleState(null);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role, full_name, email").eq("id", user.id).maybeSingle();
      const role = profile?.role;
      if (role === "student" || role === "supervisor" || role === "company") {
        setViewerRoleState(role);
        setViewerName(profile?.full_name?.trim() || profile?.email || undefined);
        drawer.setViewerRole(role);
      } else {
        setViewerRoleState(null);
      }
    })();
  }, [drawer]);

  const openChatWith = useCallback(
    (target: Omit<MessageChatTarget, "reciprocalLabel"> & { reciprocalLabel?: string }) => {
      if (!viewerRole) {
        router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      drawer.setViewerRole(viewerRole);
      drawer.openChatWith({
        ...target,
        reciprocalLabel: target.reciprocalLabel ?? viewerName,
      });
    },
    [drawer, router, viewerName, viewerRole],
  );

  const openInbox = useCallback(() => {
    if (!viewerRole) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    drawer.setViewerRole(viewerRole);
    drawer.openDrawer();
  }, [drawer, router, viewerRole]);

  const messageCompany = useCallback(
    (companyOwnerUserId: string, companyName: string) => {
      openChatWith({
        peerUserId: companyOwnerUserId,
        kind: "student_company",
        label: companyName,
      });
    },
    [openChatWith],
  );

  const messageSupervisor = useCallback(
    (supervisorUserId: string, supervisorName: string) => {
      openChatWith({
        peerUserId: supervisorUserId,
        kind: "student_supervisor",
        label: supervisorName,
      });
    },
    [openChatWith],
  );

  const messageStudent = useCallback(
    (studentUserId: string, studentName: string, kind: DmConversationKind) => {
      openChatWith({
        peerUserId: studentUserId,
        kind,
        label: studentName,
      });
    },
    [openChatWith],
  );

  return {
    viewerRole,
    canMessage: Boolean(viewerRole),
    openInbox,
    openChatWith,
    messageCompany,
    messageSupervisor,
    messageStudent,
    inboxPath: viewerRole ? messagesInboxPath(viewerRole) : null,
  };
}
