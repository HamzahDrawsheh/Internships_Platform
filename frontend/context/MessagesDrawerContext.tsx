"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DmConversationKind, MessagingViewerRole } from "@/lib/messaging";

export type MessageChatTarget = {
  peerUserId: string;
  kind: DmConversationKind;
  label: string;
  /** When student messages a company, also save reverse contact for the company owner. */
  reciprocalLabel?: string;
};

type MessagesDrawerContextValue = {
  isOpen: boolean;
  viewerRole: MessagingViewerRole | null;
  pendingTarget: MessageChatTarget | null;
  setViewerRole: (role: MessagingViewerRole | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openChatWith: (target: MessageChatTarget) => void;
  clearPendingTarget: () => void;
};

const MessagesDrawerContext = createContext<MessagesDrawerContextValue | null>(null);

export function MessagesDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewerRole, setViewerRole] = useState<MessagingViewerRole | null>(null);
  const [pendingTarget, setPendingTarget] = useState<MessageChatTarget | null>(null);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setPendingTarget(null);
  }, []);
  const clearPendingTarget = useCallback(() => setPendingTarget(null), []);

  const openChatWith = useCallback((target: MessageChatTarget) => {
    setPendingTarget(target);
    setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      viewerRole,
      pendingTarget,
      setViewerRole,
      openDrawer,
      closeDrawer,
      openChatWith,
      clearPendingTarget,
    }),
    [isOpen, viewerRole, pendingTarget, openDrawer, closeDrawer, openChatWith, clearPendingTarget],
  );

  return <MessagesDrawerContext.Provider value={value}>{children}</MessagesDrawerContext.Provider>;
}

export function useMessagesDrawer() {
  const ctx = useContext(MessagesDrawerContext);
  if (!ctx) throw new Error("useMessagesDrawer must be used within MessagesDrawerProvider");
  return ctx;
}

/** Safe hook for pages that may render outside provider during SSR. */
export function useMessagesDrawerOptional() {
  return useContext(MessagesDrawerContext);
}
