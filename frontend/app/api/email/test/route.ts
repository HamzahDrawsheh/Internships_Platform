import { NextResponse } from "next/server";

import { deliverEmail, ensureSmtpVerifiedOnce } from "@/lib/email/delivery";
import { logEmailConfigurationStatus } from "@/lib/email/log-email-status";
import { getSmtpConfigurationStatus } from "@/lib/email/config";
import { getResendConfigurationStatus } from "@/lib/email/resend-config";
import {
  getActiveEmailProvider,
  getSmtpVerifySnapshot,
  isSmtpNetworkBlocked,
} from "@/lib/email/provider-state";
import { describeSmtpNetworkBlock } from "@/lib/email/errors";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Email diagnostics + optional test send.
 *
 * GET  /api/email/test           — env + SMTP verify only
 * POST /api/email/test { "to": "you@example.com" } — verify + send test message
 */
export async function GET() {
  logEmailConfigurationStatus({ force: true });

  const smtp = getSmtpConfigurationStatus();
  const resend = getResendConfigurationStatus();

  let verify: Awaited<ReturnType<typeof ensureSmtpVerifiedOnce>> | null = null;
  if (smtp.configured) {
    verify = await ensureSmtpVerifiedOnce();
  }

  const body = {
    smtp: smtp.configured
      ? {
          host: smtp.summary.host,
          port: smtp.summary.port,
          secure: smtp.summary.secure,
          fromEmail: smtp.summary.fromEmail,
        }
      : { configured: false, missing: smtp.missing },
    resend: resend.configured
      ? { configured: true, fromEmail: resend.summary.fromEmail }
      : { configured: false, missing: resend.missing },
    verify,
    smtpNetworkBlocked: isSmtpNetworkBlocked(),
    activeProvider: getActiveEmailProvider(),
    snapshot: getSmtpVerifySnapshot(),
    hint: isSmtpNetworkBlocked()
      ? describeSmtpNetworkBlock(new Error("ETIMEDOUT"))
      : null,
  };

  return NextResponse.json(body);
}

export async function POST(request: Request) {
  try {
    logEmailConfigurationStatus({ force: true });

    const payload = (await request.json()) as { to?: string };
    const to = typeof payload.to === "string" ? payload.to.trim() : "";

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { ok: false, error: "Provide { \"to\": \"valid@email.com\" } in JSON body" },
        { status: 400 }
      );
    }

    const smtp = getSmtpConfigurationStatus();
    if (smtp.configured) {
      await ensureSmtpVerifiedOnce();
    }

    const result = await deliverEmail({
      to,
      subject: "AI Intern Jordan — SMTP/Resend test",
      html: "<p>If you received this, email delivery is working.</p>",
      text: "If you received this, email delivery is working.",
    });

    return NextResponse.json({
      ok: result.ok,
      result,
      smtpNetworkBlocked: isSmtpNetworkBlocked(),
      activeProvider: getActiveEmailProvider(),
      verify: getSmtpVerifySnapshot(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email][test] unexpected error", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
