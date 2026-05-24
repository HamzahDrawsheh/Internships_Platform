"use client";

import Link from "next/link";
import { notificationConversationHref } from "@/lib/messaging";
import { formatNotificationDate, getNotificationTypeStyles, type NotificationRow } from "@/lib/notifications-ui";
import { useNotificationHref } from "@/lib/internship-reports/use-notification-href";

type Props = {
  n: NotificationRow;
  viewerRole: string | null;
  onNavigate?: () => void;
};

export function NotificationListItem({ n, viewerRole, onNavigate }: Props) {
  const st = getNotificationTypeStyles(n.type);
  const dmHref = notificationConversationHref(viewerRole, n.related_conversation_id);
  const reportHref = useNotificationHref(n, viewerRole);
  const href = dmHref ?? reportHref;

  const inner = (
    <div className="flex gap-2">
      <span className="shrink-0 text-base leading-snug" aria-hidden>
        {st.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold leading-snug ${st.titleClass}`}>{n.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-300">{n.message}</p>
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          {formatNotificationDate(n.created_at)}
          {!n.is_read ? (
            <span className="ml-2 inline-block rounded-full bg-blue-100 px-1.5 py-0 text-[9px] font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              New
            </span>
          ) : null}
          {href ? (
            <span className="ml-2 font-medium text-[#7C3AED] dark:text-purple-300">Open →</span>
          ) : null}
        </p>
      </div>
    </div>
  );

  return (
    <li
      className={`border-l-4 ${st.accentClass} px-3 py-2.5 transition-colors ${
        n.is_read ? "bg-white dark:bg-slate-900" : "bg-blue-50/40 dark:bg-slate-800/50"
      }`}
    >
      {href ? (
        <Link
          href={href}
          className="-m-1 block rounded-lg p-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/80"
          onClick={onNavigate}
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}
