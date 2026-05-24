import type { DispatchNotificationParams, DispatchNotificationResult } from "@/lib/notifications/types";

/**
 * Client helper: calls server API so email is sent server-side (never from React directly).
 */
export async function dispatchNotification(
  params: DispatchNotificationParams
): Promise<DispatchNotificationResult> {
  try {
    const response = await fetch("/api/notifications/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const body = (await response.json()) as DispatchNotificationResult & { error?: string };

    if (!response.ok) {
      return {
        ok: false,
        error: body.ok === false ? body.error : `Request failed (${response.status})`,
      };
    }

    return body;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dispatchNotification] client fetch failed:", message);
    return { ok: false, error: message };
  }
}
