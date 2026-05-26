import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { processTransactionalEmailQueue } from "@/lib/notifications/process-email-queue";

/**
 * Drains transactional_email_queue (e.g. from DB triggers).
 * Optional header: x-cron-secret must match CRON_SECRET when set.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const admin = createAdminClient();
    const result = await processTransactionalEmailQueue(admin, { limit: 50 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/notifications/process-email-queue]:", error);
    return NextResponse.json({ ok: false, error: "Failed to process queue." }, { status: 500 });
  }
}
