import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from "@/lib/email/templates/welcome";
import { deliverEmail } from "@/lib/email/delivery";
import { getSmtpConfig } from "@/lib/email/config";
import type { SendEmailParams, SendEmailResult } from "@/lib/email/types";

export type { SendEmailParams, SendEmailResult };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  return deliverEmail(params);
}

export async function sendWelcomeEmail(params: {
  to: string;
  recipientName: string | null;
}): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  const appName = config?.fromName ?? "AI Intern Jordan";

  return deliverEmail({
    to: params.to,
    subject: `Welcome to ${appName}`,
    html: buildWelcomeEmailHtml({ recipientName: params.recipientName, appName }),
    text: buildWelcomeEmailText({ recipientName: params.recipientName, appName }),
  });
}
