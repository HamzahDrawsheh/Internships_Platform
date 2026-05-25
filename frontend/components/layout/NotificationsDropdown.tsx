"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type NotificationRow } from "@/lib/notifications-ui";
import { NotificationListItem } from "@/components/internship-reports/NotificationListItem";
import { NAV_BELL_BUTTON_CLASS } from "@/components/layout/navControlStyles";

const PANEL_LIMIT = 12;

type Props = {
  /** When false, the control is not rendered. */
  enabled: boolean;
};

export default function NotificationsDropdown({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (countError) {
      console.error("notifications unread count:", countError);
      return;
    }
    setUnreadCount(count ?? 0);
  }, [enabled]);

  const loadPanel = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setItems([]);
      setViewerRole(null);
      setLoading(false);
      setError(userError ? "Unable to load account." : null);
      return;
    }

    const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    setViewerRole(profileRow?.role ?? null);

    const { data, error: qErr } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, related_conversation_id, related_internship_id, related_monthly_report_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PANEL_LIMIT);

    if (qErr) {
      console.error("notifications dropdown query:", qErr);
      setError("Could not load notifications.");
      setItems([]);
    } else {
      setItems((data ?? []) as NotificationRow[]);
    }
    setLoading(false);
    void refreshUnreadCount();
  }, [enabled, refreshUnreadCount]);

  useEffect(() => {
    if (!enabled) return;
    void fetch("/api/notifications/process-email-queue", { method: "POST" }).catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUnreadCount(0);
        return;
      }
      void refreshUnreadCount();
    });
    return () => subscription.unsubscribe();
  }, [enabled, refreshUnreadCount]);

  const markAllRead = async () => {
    if (!enabled || unreadCount === 0) return;

    setMarkingAll(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMarkingAll(false);
      return;
    }

    const { error: markError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (markError) {
      console.error("notifications mark read:", markError);
      setError("Could not mark as read.");
      setMarkingAll(false);
      return;
    }

    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen((wasOpen) => {
            const next = !wasOpen;
            if (next) {
              queueMicrotask(() => void loadPanel());
            }
            return next;
          })
        }
        className={NAV_BELL_BUTTON_CLASS}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="text-lg" aria-hidden>
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#7C3AED] px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-20 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
              <button
                type="button"
                disabled={markingAll || unreadCount === 0}
                onClick={() => void markAllRead()}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-[#7C3AED] hover:bg-violet-50 disabled:opacity-40 dark:hover:bg-violet-500/10"
              >
                {markingAll ? "…" : "Mark read"}
              </button>
            </div>

            <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
              {loading ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : error ? (
                <p className="px-3 py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((n) => (
                    <NotificationListItem
                      key={n.id}
                      n={n}
                      viewerRole={viewerRole}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-[#7C3AED] hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
            >
              View all
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
