import type { SupabaseClient } from "@supabase/supabase-js";

import type { DispatchNotificationParams } from "@/lib/notifications/types";
import type { NotificationRowType } from "@/lib/notifications-ui";

export const COMPANY_TO_STUDENT_NOTIFICATION_TYPES = new Set<NotificationRowType>([
  "accepted",
  "rejected",
  "application_accepted",
  "application_rejected",
  "training_completed",
  "application_expired",
  "commitment_required",
  "commitment_confirmed",
  "commitment_expired",
  "application_withdrawn",
]);

export const STUDENT_TO_COMPANY_NOTIFICATION_TYPES = new Set<NotificationRowType>([
  "new_application",
  "new_feedback",
  "new_training_evaluation",
]);

async function rpcBool(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, string>
): Promise<boolean> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`[authorizeDispatch] ${fn}:`, error);
    return false;
  }
  return data === true;
}

/**
 * Verifies the authenticated user may notify the recipient (mirrors RLS helper functions).
 */
export async function authorizeNotificationDispatch(
  supabase: SupabaseClient,
  actorUserId: string,
  params: DispatchNotificationParams
): Promise<{ allowed: boolean; error?: string }> {
  if (params.recipientUserId === actorUserId) {
    return { allowed: false, error: "Cannot notify yourself via dispatch." };
  }

  const { type, recipientUserId } = params;

  if (type === "new_direct_message" || type === "info") {
    return { allowed: false, error: "This notification type cannot be sent via the dispatch API." };
  }

  if (STUDENT_TO_COMPANY_NOTIFICATION_TYPES.has(type)) {
    if (type === "new_application") {
      if (!params.relatedApplicationId) {
        return { allowed: false, error: "relatedApplicationId is required." };
      }
      const allowed = await rpcBool(supabase, "student_can_notify_company_new_application", {
        application_row_id: params.relatedApplicationId,
        target_company_user_id: recipientUserId,
      });
      return allowed
        ? { allowed: true }
        : { allowed: false, error: "You are not allowed to notify this company for this application." };
    }

    if (type === "new_feedback") {
      if (!params.relatedRatingId) {
        return { allowed: false, error: "relatedRatingId is required." };
      }
      const allowed = await rpcBool(supabase, "student_can_notify_company_rating", {
        rating_row_id: params.relatedRatingId,
        target_company_user_id: recipientUserId,
      });
      return allowed
        ? { allowed: true }
        : { allowed: false, error: "You are not allowed to notify this company for this rating." };
    }

    if (type === "new_training_evaluation") {
      if (!params.relatedApplicationId) {
        return { allowed: false, error: "relatedApplicationId is required." };
      }
      const allowed = await rpcBool(supabase, "student_can_notify_company_training_evaluation", {
        p_application_id: params.relatedApplicationId,
        target_company_user_id: recipientUserId,
      });
      return allowed
        ? { allowed: true }
        : { allowed: false, error: "You are not allowed to notify this company for this evaluation." };
    }
  }

  if (COMPANY_TO_STUDENT_NOTIFICATION_TYPES.has(type)) {
    if (!params.relatedApplicationId) {
      return { allowed: false, error: "relatedApplicationId is required." };
    }
    const allowed = await rpcBool(supabase, "company_can_notify_application_user", {
      application_row_id: params.relatedApplicationId,
      target_user_id: recipientUserId,
    });
    return allowed
      ? { allowed: true }
      : { allowed: false, error: "You are not allowed to notify this student for this application." };
  }

  return { allowed: false, error: `Unsupported notification type: ${type}` };
}

/** Types allowed in POST /api/notifications/dispatch (must match authorizeNotificationDispatch). */
export function isDispatchApiNotificationType(type: string): type is NotificationRowType {
  return (
    COMPANY_TO_STUDENT_NOTIFICATION_TYPES.has(type as NotificationRowType) ||
    STUDENT_TO_COMPANY_NOTIFICATION_TYPES.has(type as NotificationRowType)
  );
}
