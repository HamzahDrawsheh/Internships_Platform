import { NextResponse } from "next/server";

import { ensureSmtpVerifiedOnce } from "@/lib/email/delivery";
import { getSmtpConfigurationStatus } from "@/lib/email/config";
import { logEmailConfigurationStatus } from "@/lib/email/log-email-status";
import { getResendConfigurationStatus } from "@/lib/email/resend-config";
import {
  getActiveEmailProvider,
  getSmtpVerifySnapshot,
  isSmtpNetworkBlocked,
} from "@/lib/email/provider-state";
import { requireAdminUser } from "@/lib/server/require-admin";

/**
 * GET /api/email/status — env + optional SMTP verify
 */
export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  logEmailConfigurationStatus({ force: true });

  const smtp = getSmtpConfigurationStatus();
  const resend = getResendConfigurationStatus();

  let verify = null;
  if (smtp.configured) {
    verify = await ensureSmtpVerifiedOnce();
  }

  return NextResponse.json({
    smtp: smtp.configured
      ? {
          configured: true,
          host: smtp.summary.host,
          port: smtp.summary.port,
          secure: smtp.summary.secure,
          fromEmail: smtp.summary.fromEmail,
          fromName: smtp.summary.fromName,
        }
      : { configured: false, missing: smtp.missing },
    resend: resend.configured
      ? { configured: true, fromEmail: resend.summary.fromEmail }
      : { configured: false, missing: resend.missing },
    verify,
    smtpNetworkBlocked: isSmtpNetworkBlocked(),
    activeProvider: getActiveEmailProvider(),
    snapshot: getSmtpVerifySnapshot(),
  });
}
