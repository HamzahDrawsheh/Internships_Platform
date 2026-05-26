import { getSmtpConfigurationStatus } from "@/lib/email/config";
import { SMTP_ENV_KEYS, RESEND_ENV_KEYS } from "@/lib/email/env-keys";
import { getResendConfigurationStatus } from "@/lib/email/resend-config";
import {
  getActiveEmailProvider,
  getSmtpVerifySnapshot,
  isSmtpNetworkBlocked,
} from "@/lib/email/provider-state";

let hasLoggedStartupStatus = false;

export function logEmailConfigurationStatus(options?: { force?: boolean }): void {
  if (hasLoggedStartupStatus && !options?.force) {
    return;
  }

  const smtp = getSmtpConfigurationStatus();
  const resend = getResendConfigurationStatus();
  const verify = getSmtpVerifySnapshot();

  if (smtp.configured) {
    console.info("[email] SMTP env loaded");
    console.info(`[email]   ${SMTP_ENV_KEYS.host}=${smtp.summary.host}`);
    console.info(`[email]   ${SMTP_ENV_KEYS.port}=${smtp.summary.port}`);
    console.info(`[email]   ${SMTP_ENV_KEYS.secure}=${smtp.summary.secure}`);
    console.info(`[email]   ${SMTP_ENV_KEYS.user}=${maskEmail(smtp.summary.user)}`);
    console.info(`[email]   ${SMTP_ENV_KEYS.fromEmail}=${smtp.summary.fromEmail}`);
    console.info(`[email]   ${SMTP_ENV_KEYS.password}=******** (set)`);
  } else {
    console.warn("[email] SMTP env incomplete:", smtp.missing.join(", "));
  }

  if (resend.configured) {
    console.info("[email] Resend API fallback configured");
    console.info(`[email]   ${RESEND_ENV_KEYS.apiKey}=******** (set)`);
    console.info(`[email]   from=${resend.summary.fromEmail}`);
  } else {
    console.warn(
      "[email] Resend fallback not configured — add RESEND_API_KEY if SMTP ports are blocked"
    );
  }

  if (verify.attempted) {
    console.info("[email] SMTP verify snapshot", {
      ok: verify.ok,
      networkBlocked: verify.networkBlocked,
      lastError: verify.lastError,
    });
  }

  if (isSmtpNetworkBlocked()) {
    console.warn("[email] SMTP network blocked — using Resend when sending");
  }

  const active = getActiveEmailProvider();
  if (active) {
    console.info(`[email] Last successful provider: ${active}`);
  }

  if (!smtp.configured && !resend.configured) {
    console.warn("[email] No email provider ready — transactional email disabled");
  }

  hasLoggedStartupStatus = true;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}
