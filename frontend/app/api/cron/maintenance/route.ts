import { NextResponse } from "next/server";

import { logger } from "@/lib/observability";
import { processTransactionalEmailQueue } from "@/lib/notifications/process-email-queue";
import { createAdminClient } from "@/lib/supabase/admin";

async function runRpc(
  admin: ReturnType<typeof createAdminClient>,
  name: string
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc(name);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    const status = process.env.NODE_ENV === "production" ? 500 : 503;
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status });
  }

  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [expiredCommitments, completedTrainings, emailQueue] = await Promise.all([
      runRpc(admin, "expire_stale_application_commitments"),
      runRpc(admin, "auto_complete_expired_trainings"),
      processTransactionalEmailQueue(admin, { limit: 100, maxAttempts: 5 }),
    ]);
    logger.info("cron.maintenance.completed", {
      emailProcessed: emailQueue.processed,
      emailFailed: emailQueue.failed,
      emailSkipped: emailQueue.skipped,
    });

    return NextResponse.json({
      ok: true,
      expiredCommitments,
      completedTrainings,
      emailQueue,
    });
  } catch (error) {
    logger.error("cron.maintenance.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Maintenance job failed." }, { status: 500 });
  }
}
