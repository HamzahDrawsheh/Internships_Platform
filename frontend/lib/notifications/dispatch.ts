import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeNotificationSettings } from "@/lib/notification-preferences";
import { authorizeNotificationDispatch } from "@/lib/notifications/authorize-dispatch";
import { processTransactionalEmailQueue } from "@/lib/notifications/process-email-queue";
import type {
  DispatchNotificationParams,
  DispatchNotificationResult,
} from "@/lib/notifications/types";
import { formatPostgrestError } from "@/lib/postgrest-error";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only: creates in-app notification per push_notifications and sends email per email_notifications.
 * marketing_notifications is never used here.
 */
export async function dispatchNotification(
  params: DispatchNotificationParams
): Promise<DispatchNotificationResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in to send notifications." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[dispatchNotification] admin client:", error);
    return { ok: false, error: "Server configuration error." };
  }

  const { data: recipient, error: recipientError } = await admin
    .from("profiles")
    .select("id, email, full_name, email_notifications, push_notifications, marketing_notifications")
    .eq("id", params.recipientUserId)
    .maybeSingle();

  if (recipientError) {
    return { ok: false, error: formatPostgrestError(recipientError) };
  }

  if (!recipient) {
    return { ok: false, error: "Recipient profile not found." };
  }

  const authz = await authorizeNotificationDispatch(supabase, user.id, params);
  if (!authz.allowed) {
    return { ok: false, error: authz.error ?? "Not authorized to send this notification." };
  }

  const prefs = normalizeNotificationSettings(recipient);
  const linkPath = params.linkPath ?? "/notifications";

  let notificationId: string | null = null;

  if (prefs.push_notifications) {
    const notificationPayload = {
      user_id: params.recipientUserId,
      title: params.title,
      message: params.message,
      type: params.type,
      is_read: false,
      related_application_id: params.relatedApplicationId ?? null,
      related_rating_id: params.relatedRatingId ?? null,
      related_conversation_id: params.relatedConversationId ?? null,
      idempotency_key: params.idempotencyKey ?? null,
    };
    // Service role: recipient is another user; client session cannot insert under RLS.
    const { data: inserted, error: insertError } = params.idempotencyKey
      ? await admin
          .from("notifications")
          .upsert(notificationPayload, { onConflict: "idempotency_key", ignoreDuplicates: true })
          .select("id")
          .maybeSingle()
      : await admin
          .from("notifications")
          .insert(notificationPayload)
          .select("id")
          .maybeSingle();

    if (insertError) {
      console.error("[dispatchNotification] in-app insert:", formatPostgrestError(insertError));
      return { ok: false, error: `Could not create in-app notification: ${formatPostgrestError(insertError)}` };
    }

    notificationId = inserted?.id ?? null;
  }

  const emailSent = false;
  let emailSkippedReason: string | undefined;

  if (!prefs.email_notifications) {
    emailSkippedReason = "recipient disabled email notifications";
  } else if (!recipient.email?.trim()) {
    emailSkippedReason = "recipient has no email address";
  } else {
    const emailPayload = {
      user_id: params.recipientUserId,
      recipient_email: recipient.email.trim(),
      title: params.title,
      message: params.message,
      type: params.type,
      link_path: linkPath,
      notification_id: notificationId,
      idempotency_key: params.idempotencyKey ? `${params.idempotencyKey}:email` : null,
    };
    const { error: queueError } = params.idempotencyKey
      ? await admin
          .from("transactional_email_queue")
          .upsert(emailPayload, { onConflict: "idempotency_key", ignoreDuplicates: true })
      : await admin.from("transactional_email_queue").insert(emailPayload);

    if (queueError) {
      emailSkippedReason = `email queue failed: ${formatPostgrestError(queueError)}`;
      console.warn("[dispatchNotification] email queue failed", {
        recipientUserId: params.recipientUserId,
        type: params.type,
        reason: emailSkippedReason,
      });
    } else {
      emailSkippedReason = "queued for delivery";
    }
  }

  void processTransactionalEmailQueue(admin, { limit: 10 }).catch((err) => {
    console.error("[dispatchNotification] queue drain error:", err);
  });

  if (!prefs.push_notifications && !emailSent && !emailSkippedReason?.includes("disabled")) {
    return {
      ok: true,
      notificationId: null,
      inAppCreated: false,
      emailSent: false,
      emailSkippedReason: emailSkippedReason ?? "no channels enabled",
    };
  }

  return {
    ok: true,
    notificationId,
    inAppCreated: prefs.push_notifications,
    emailSent,
    emailSkippedReason,
  };
}
