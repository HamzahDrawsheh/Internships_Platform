import { getErrorMessage } from "@/lib/email/errors";
import { getResendConfig } from "@/lib/email/resend-config";
import type { SendEmailParams } from "@/lib/email/types";

export type ResendSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/**
 * Sends email via Resend HTTPS API (works when SMTP ports are blocked).
 */
export async function sendViaResend(params: SendEmailParams): Promise<ResendSendResult> {
  const config = getResendConfig();
  if (!config) {
    const error = "Resend is not configured (set RESEND_API_KEY in .env.local)";
    console.warn("[email][resend]", error);
    return { ok: false, error };
  }

  console.info("[email][resend] Sending via API", {
    to: params.to,
    subject: params.subject,
    from: config.fromEmail,
  });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(config.apiKey);

    const { data, error } = await resend.emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error("[email][resend] API error", { message: error.message, name: error.name });
      return { ok: false, error: error.message };
    }

    const messageId = data?.id ?? "resend-unknown-id";
    console.info("[email][resend] Sent OK", { messageId, to: params.to });
    return { ok: true, messageId };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[email][resend] Unexpected error", { message });
    return { ok: false, error: message };
  }
}
