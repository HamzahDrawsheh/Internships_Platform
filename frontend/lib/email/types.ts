export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendEmailResult =
  | { ok: true; messageId: string; provider: "smtp" | "resend" }
  | {
      ok: false;
      reason: "not_configured" | "send_failed";
      error?: string;
      provider?: "smtp" | "resend";
      smtpNetworkBlocked?: boolean;
    };
