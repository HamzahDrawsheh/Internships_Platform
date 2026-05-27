import type { SupabaseClient } from "@supabase/supabase-js";

import { deliverEmail } from "@/lib/email/delivery";
import { buildTransactionalNotificationEmail, resolveAppBaseUrl } from "@/lib/notifications/email-template";
import { formatPostgrestError } from "@/lib/postgrest-error";

const APP_NAME = process.env.SMTP_FROM_NAME?.trim() || "AI Intern Jordan";

export type TransactionalEmailQueueRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link_path: string | null;
  recipient_email: string;
  attempts: number;
};

/**
 * Sends pending rows from transactional_email_queue (created by DB triggers).
 */
export async function processTransactionalEmailQueue(
  admin: SupabaseClient,
  options?: { limit?: number; maxAttempts?: number }
): Promise<{ processed: number; failed: number; skipped: number }> {
  const limit = options?.limit ?? 25;
  const maxAttempts = options?.maxAttempts ?? 5;

  const { data: rows, error } = await admin
    .from("transactional_email_queue")
    .select("id, user_id, title, message, type, link_path, recipient_email, attempts")
    .is("processed_at", null)
    .lt("attempts", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[notification-email-queue] load failed:", formatPostgrestError(error));
    return { processed: 0, failed: 0, skipped: 0 };
  }

  if (!rows?.length) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const baseUrl = resolveAppBaseUrl();

  for (const row of rows as TransactionalEmailQueueRow[]) {
    const email = row.recipient_email?.trim();
    if (!email) {
      await admin
        .from("transactional_email_queue")
        .update({ processed_at: new Date().toISOString(), last_error: "no recipient email" })
        .eq("id", row.id);
      skipped += 1;
      continue;
    }

    const linkUrl = row.link_path
      ? `${baseUrl}${row.link_path.startsWith("/") ? row.link_path : `/${row.link_path}`}`
      : `${baseUrl}/notifications`;

    const { subject, html, text } = buildTransactionalNotificationEmail({
      appName: APP_NAME,
      title: row.title,
      message: row.message,
      linkUrl,
    });

    const result = await deliverEmail({ to: email, subject, html, text });

    if (result.ok) {
      await admin
        .from("transactional_email_queue")
        .update({
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
      processed += 1;
      console.info("[notification-email-queue] sent", {
        queueId: row.id,
        type: row.type,
        to: email,
      });
    } else {
      const errMsg =
        result.reason === "not_configured"
          ? "email provider not configured"
          : result.error ?? "send failed";
      const nextAttempts = (row.attempts ?? 0) + 1;
      await admin
        .from("transactional_email_queue")
        .update({
          last_error: errMsg,
          attempts: nextAttempts,
        })
        .eq("id", row.id);
      failed += 1;
      console.warn("[notification-email-queue] send failed", {
        queueId: row.id,
        attempts: nextAttempts,
        deadLettered: nextAttempts >= maxAttempts,
        error: errMsg,
      });
    }
  }

  return { processed, failed, skipped };
}
