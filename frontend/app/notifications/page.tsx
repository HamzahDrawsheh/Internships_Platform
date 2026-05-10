"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { notificationConversationHref } from "@/lib/messaging";
import {
  formatNotificationDate,
  getNotificationTypeStyles,
  type NotificationRow,
} from "@/lib/notifications-ui";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("notifications getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }

      if (!user) {
        setNotifications([]);
        setViewerRole(null);
        setLoading(false);
        return;
      }

      const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setViewerRole(profileRow?.role ?? null);

      const { data, error: notificationsError } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at, related_conversation_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notificationsError) {
        console.error("notifications query error:", notificationsError);
        setError("Unable to load notifications.");
        setLoading(false);
        return;
      }

      setNotifications((data ?? []) as NotificationRow[]);
      setLoading(false);
    };

    loadNotifications();
  }, []);

  const markAllRead = async () => {
    setError(null);
    setMarkingAll(true);
    const supabase = createClient();
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }

    const { error: markError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (markError) {
      console.error("notifications mark all read error:", markError);
      setError("Unable to mark notifications as read.");
      setMarkingAll(false);
      return;
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setMarkingAll(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-3xl">
        <PageHeader
          title="Notifications"
          description="In-app notification center for all roles."
          action={
            <Button
              variant="secondary"
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              onClick={markAllRead}
              disabled={markingAll || notifications.length === 0}
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>
          }
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading notifications...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up. Notifications will appear here when updates are available."
          />
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white transition-colors duration-300 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {notifications.map((notification) => {
              const typeStyles = getNotificationTypeStyles(notification.type);
              const dmHref = notificationConversationHref(viewerRole, notification.related_conversation_id);
              const body = (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg" aria-hidden>
                      {typeStyles.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${typeStyles.titleClass}`}>{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-700 transition-colors duration-300 dark:text-slate-300">{notification.message}</p>
                      {dmHref ? (
                        <p className="mt-2 text-xs font-medium text-purple-700 dark:text-purple-300">Tap row to open chat →</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                    {!notification.is_read && (
                      <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 transition-colors duration-300 dark:bg-blue-500/20 dark:text-blue-300">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              );
              return (
                <li
                  key={notification.id}
                  className={`border-l-4 px-4 py-4 transition-colors duration-300 ${typeStyles.accentClass} ${notification.is_read ? "bg-white dark:bg-slate-900" : "bg-blue-50/30 dark:bg-slate-800/60"}`}
                >
                  {dmHref ? (
                    <Link href={dmHref} className="-m-2 block rounded-lg p-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
