import { createAdminClient } from "@/lib/supabase/admin";
import { deliverEmail } from "@/lib/email/delivery";
import { normalizeNotificationSettings } from "@/lib/notification-preferences";
import { authorizeNotificationDispatch } from "@/lib/notifications/authorize-dispatch";
import { buildTransactionalNotificationEmail, resolveAppBaseUrl } from "@/lib/notifications/email-template";
import { processTransactionalEmailQueue } from "@/lib/notifications/process-email-queue";
import type {
  DispatchNotificationParams,
  DispatchNotificationResult,
} from "@/lib/notifications/types";
import { formatPostgrestError } from "@/lib/postgrest-error";
import { createClient } from "@/lib/supabase/server";

const APP_NAME = process.env.SMTP_FROM_NAME?.trim() || "AI Intern Jordan";

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
  const baseUrl = resolveAppBaseUrl();
  const linkPath = params.linkPath ?? "/notifications";
  const linkUrl = `${baseUrl}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}`;

  let notificationId: string | null = null;

  if (prefs.push_notifications) {
    // Service role: recipient is another user; client session cannot insert under RLS.
    const { data: inserted, error: insertError } = await admin
      .from("notifications")
      .insert({
        user_id: params.recipientUserId,
        title: params.title,
        message: params.message,
        type: params.type,
        is_read: false,
        related_application_id: params.relatedApplicationId ?? null,
        related_rating_id: params.relatedRatingId ?? null,
        related_conversation_id: params.relatedConversationId ?? null,
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[dispatchNotification] in-app insert:", formatPostgrestError(insertError));
      return { ok: false, error: `Could not create in-app notification: ${formatPostgrestError(insertError)}` };
    }

    notificationId = inserted?.id ?? null;
  }

  let emailSent = false;
  let emailSkippedReason: string | undefined;

  if (!prefs.email_notifications) {
    emailSkippedReason = "recipient disabled email notifications";
  } else if (!recipient.email?.trim()) {
    emailSkippedReason = "recipient has no email address";
  } else {
    const { subject, html, text } = buildTransactionalNotificationEmail({
      appName: APP_NAME,
      title: params.title,
      message: params.message,
      linkUrl,
    });

    const emailResult = await deliverEmail({
      to: recipient.email.trim(),
      subject,
      html,
      text,
    });

    if (emailResult.ok) {
      emailSent = true;
      console.info("[dispatchNotification] email sent", {
        recipientUserId: params.recipientUserId,
        type: params.type,
        messageId: emailResult.messageId,
        provider: emailResult.provider,
      });
    } else {
      emailSkippedReason =
        emailResult.reason === "not_configured"
          ? "email provider not configured"
          : emailResult.error ?? "email send failed";
      console.warn("[dispatchNotification] email failed", {
        recipientUserId: params.recipientUserId,
        type: params.type,
        reason: emailSkippedReason,
      });
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
