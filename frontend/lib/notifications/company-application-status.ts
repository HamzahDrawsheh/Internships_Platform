import type { Locale } from "@/lib/i18n/messages";
import { isDispatchApiNotificationType } from "@/lib/notifications/authorize-dispatch";
import type { DispatchNotificationParams } from "@/lib/notifications/types";
import type { NotificationRowType } from "@/lib/notifications-ui";

export type CompanyNotifyApplicationStatus = "accepted" | "rejected" | "completed";

function statusLabelForMessage(status: string, locale: Locale): string {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "pending", ar: "قيد المراجعة" },
    accepted_pending_commit: { en: "accepted (awaiting your confirmation)", ar: "مقبول (بانتظار تأكيدك)" },
    accepted: { en: "accepted", ar: "مقبول" },
    rejected: { en: "rejected", ar: "مرفوض" },
    completed: { en: "completed", ar: "مكتمل" },
    commitment_expired: { en: "commitment expired", ar: "انتهت مهلة التأكيد" },
    withdrawn: { en: "withdrawn", ar: "منسحب" },
  };
  const row = labels[status];
  if (!row) return status;
  return locale === "ar" ? row.ar : row.en;
}

export function buildCompanyApplicationStatusNotification(
  status: CompanyNotifyApplicationStatus,
  companyName: string,
  locale: Locale,
  relatedApplicationId: string
): Pick<DispatchNotificationParams, "title" | "message" | "type" | "relatedApplicationId" | "linkPath"> {
  const company = companyName.trim() || (locale === "ar" ? "الشركة" : "the company");

  if (status === "accepted") {
    return {
      type: "commitment_required",
      title: locale === "ar" ? "تم قبول طلبك" : "Application Accepted",
      message:
        locale === "ar"
          ? `تم قبول طلبك من قبل ${company}.`
          : `Your application has been accepted by ${company}.`,
      relatedApplicationId,
      linkPath: "/applications",
    };
  }

  if (status === "rejected") {
    return {
      type: "application_rejected",
      title: locale === "ar" ? "لم يتم اختيار طلبك" : "Application Rejected",
      message:
        locale === "ar"
          ? `لم يتم اختيار طلبك من قبل ${company}.`
          : `Your application was not selected by ${company}.`,
      relatedApplicationId,
      linkPath: "/applications",
    };
  }

  return {
    type: "training_completed",
    title: locale === "ar" ? "تم تحديث حالة الطلب" : "Application Status Updated",
    message:
      locale === "ar"
        ? `تم تحديث حالة طلبك إلى ${statusLabelForMessage("completed", locale)}.`
        : `Your application status has been updated to ${statusLabelForMessage("completed", locale)}.`,
    relatedApplicationId,
    linkPath: "/applications",
  };
}

export function isValidCompanyDispatchPayload(
  params: DispatchNotificationParams
): params is DispatchNotificationParams & {
  recipientUserId: string;
  relatedApplicationId: string;
  type: NotificationRowType;
} {
  return (
    typeof params.recipientUserId === "string" &&
    params.recipientUserId.trim().length > 0 &&
    typeof params.title === "string" &&
    params.title.trim().length > 0 &&
    typeof params.message === "string" &&
    params.message.trim().length > 0 &&
    typeof params.type === "string" &&
    isDispatchApiNotificationType(params.type) &&
    typeof params.relatedApplicationId === "string" &&
    params.relatedApplicationId.trim().length > 0
  );
}
