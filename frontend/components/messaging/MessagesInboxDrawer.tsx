"use client";

import { useMessagesDrawer } from "@/context/MessagesDrawerContext";
import { DirectMessagesPanel } from "@/components/messaging/DirectMessagesPanel";
import { messagesInboxPath } from "@/lib/messaging";

export function MessagesInboxDrawer() {
  const { isOpen, viewerRole, pendingTarget, closeDrawer, clearPendingTarget } = useMessagesDrawer();

  if (!isOpen || !viewerRole) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        aria-label="Close messages"
        onClick={closeDrawer}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950"
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
      >
        <DirectMessagesPanel
          viewerRole={viewerRole}
          variant="drawer"
          basePath={messagesInboxPath(viewerRole)}
          onClose={closeDrawer}
          pendingTarget={pendingTarget}
          onPendingHandled={clearPendingTarget}
        />
      </aside>
    </>
  );
}
