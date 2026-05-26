import { NextResponse } from "next/server";

import { isDispatchApiNotificationType } from "@/lib/notifications/authorize-dispatch";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { DispatchNotificationParams } from "@/lib/notifications/types";
import type { NotificationRowType } from "@/lib/notifications-ui";

function isValidPayload(body: unknown): body is DispatchNotificationParams {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return (
    typeof o.recipientUserId === "string" &&
    o.recipientUserId.length > 0 &&
    typeof o.title === "string" &&
    o.title.trim().length > 0 &&
    typeof o.message === "string" &&
    o.message.trim().length > 0 &&
    typeof o.type === "string" &&
    isDispatchApiNotificationType(o.type)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isValidPayload(body)) {
      return NextResponse.json(
        { ok: false, error: "Invalid notification payload." },
        { status: 400 }
      );
    }

    const result = await dispatchNotification({
      recipientUserId: body.recipientUserId,
      type: body.type as NotificationRowType,
      title: body.title.trim(),
      message: body.message.trim(),
      relatedApplicationId: body.relatedApplicationId ?? null,
      relatedRatingId: body.relatedRatingId ?? null,
      relatedConversationId: body.relatedConversationId ?? null,
      linkPath: typeof body.linkPath === "string" ? body.linkPath : null,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/notifications/dispatch] unexpected:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
