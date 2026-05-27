import type { NotificationRowType } from "@/lib/notifications-ui";

export type DispatchNotificationParams = {
  recipientUserId: string;
  type: NotificationRowType;
  title: string;
  message: string;
  relatedApplicationId?: string | null;
  relatedRatingId?: string | null;
  relatedConversationId?: string | null;
  idempotencyKey?: string | null;
  /** Optional deep link path (e.g. /applications). */
  linkPath?: string | null;
};

export type DispatchNotificationResult =
  | {
      ok: true;
      notificationId: string | null;
      inAppCreated: boolean;
      emailSent: boolean;
      emailSkippedReason?: string;
    }
  | { ok: false; error: string };
