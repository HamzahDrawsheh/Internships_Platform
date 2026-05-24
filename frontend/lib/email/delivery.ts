import { getSmtpConfig, isEmailConfigured } from "@/lib/email/config";
import { isResendConfigured } from "@/lib/email/resend-config";
import { sendViaResend } from "@/lib/email/providers/resend";
import { sendViaSmtp, verifySmtpConnection } from "@/lib/email/providers/smtp";
import {
  getActiveEmailProvider,
  getSmtpVerifySnapshot,
  isSmtpNetworkBlocked,
  setActiveEmailProvider,
} from "@/lib/email/provider-state";
import type { SendEmailParams, SendEmailResult } from "@/lib/email/types";

let verifyPromise: Promise<Awaited<ReturnType<typeof verifySmtpConnection>>> | null = null;

export async function ensureSmtpVerifiedOnce(): Promise<Awaited<ReturnType<typeof verifySmtpConnection>>> {
  const snapshot = getSmtpVerifySnapshot();
  if (snapshot.attempted) {
    if (snapshot.ok) {
      return { ok: true, latencyMs: 0 };
    }
    return {
      ok: false,
      networkBlocked: snapshot.networkBlocked,
      error: snapshot.lastError ?? "SMTP verify failed",
    };
  }

  if (!verifyPromise) {
    verifyPromise = verifySmtpConnection();
  }
  return verifyPromise;
}

/**
 * Sends email: SMTP (465/TLS) first, auto-fallback to Resend on network timeout/block.
 */
export async function deliverEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const smtpReady = isEmailConfigured();
  const resendReady = isResendConfigured();

  console.info("[email] deliverEmail", {
    to: params.to,
    subject: params.subject,
    smtpReady,
    resendReady,
    smtpNetworkBlocked: isSmtpNetworkBlocked(),
  });

  if (!smtpReady && !resendReady) {
    console.warn("[email] No provider configured — set SMTP_* and/or RESEND_API_KEY in .env.local");
    return { ok: false, reason: "not_configured" };
  }

  const tryResendFirst =
    resendReady && (isSmtpNetworkBlocked() || !smtpReady || getActiveEmailProvider() === "resend");

  if (tryResendFirst) {
    const resendResult = await sendViaResend(params);
    if (resendResult.ok) {
      setActiveEmailProvider("resend");
      return { ok: true, messageId: resendResult.messageId, provider: "resend" };
    }
    if (!smtpReady) {
      return {
        ok: false,
        reason: "send_failed",
        error: resendResult.error,
        provider: "resend",
      };
    }
    console.warn("[email] Resend failed; attempting SMTP as fallback", { error: resendResult.error });
  }

  const smtpConfig = getSmtpConfig();
  if (smtpConfig && !isSmtpNetworkBlocked()) {
    if (!getSmtpVerifySnapshot().attempted) {
      const verify = await ensureSmtpVerifiedOnce();
      if (!verify.ok && verify.networkBlocked && resendReady) {
        console.info("[email] SMTP verify blocked — switching to Resend");
        const resendResult = await sendViaResend(params);
        if (resendResult.ok) {
          setActiveEmailProvider("resend");
          return { ok: true, messageId: resendResult.messageId, provider: "resend" };
        }
      }
    }

    const smtpResult = await sendViaSmtp(params, smtpConfig);
    if (smtpResult.ok) {
      setActiveEmailProvider("smtp");
      return { ok: true, messageId: smtpResult.messageId, provider: "smtp" };
    }

    if (smtpResult.networkBlocked && resendReady) {
      console.info("[email] SMTP send blocked — retrying via Resend API");
      const resendResult = await sendViaResend(params);
      if (resendResult.ok) {
        setActiveEmailProvider("resend");
        return { ok: true, messageId: resendResult.messageId, provider: "resend" };
      }
      return {
        ok: false,
        reason: "send_failed",
        error: resendResult.error,
        provider: "resend",
        smtpNetworkBlocked: true,
      };
    }

    return {
      ok: false,
      reason: "send_failed",
      error: smtpResult.error,
      provider: "smtp",
      smtpNetworkBlocked: smtpResult.networkBlocked,
    };
  }

  if (resendReady) {
    const resendResult = await sendViaResend(params);
    if (resendResult.ok) {
      setActiveEmailProvider("resend");
      return { ok: true, messageId: resendResult.messageId, provider: "resend" };
    }
    return { ok: false, reason: "send_failed", error: resendResult.error, provider: "resend" };
  }

  return {
    ok: false,
    reason: "send_failed",
    error: "SMTP unavailable and Resend not configured",
    smtpNetworkBlocked: isSmtpNetworkBlocked(),
  };
}
