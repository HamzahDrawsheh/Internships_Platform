"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveMonthlyReportNotificationHref } from "@/lib/internship-reports/notification-links";
import type { NotificationRow } from "@/lib/notifications-ui";

export function useNotificationHref(n: NotificationRow, viewerRole: string | null) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!n.related_internship_id && !n.related_monthly_report_id) {
      setHref(null);
      return;
    }
    const supabase = createClient();
    void resolveMonthlyReportNotificationHref(supabase, {
      type: n.type,
      related_internship_id: n.related_internship_id,
      related_monthly_report_id: n.related_monthly_report_id,
      viewerRole,
    }).then(setHref);
  }, [n.type, n.related_internship_id, n.related_monthly_report_id, viewerRole]);

  return href;
}
