/**
 * Runs once when the Next.js server starts (dev and production).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSmtpEnvLoaded } = await import("@/lib/env/load-smtp-env");
    ensureSmtpEnvLoaded();

    const { logEmailConfigurationStatus } = await import("@/lib/email/log-email-status");
    logEmailConfigurationStatus();

    const { getSmtpConfigurationStatus } = await import("@/lib/email/config");
    if (getSmtpConfigurationStatus().configured) {
      const { verifySmtpConnection } = await import("@/lib/email/providers/smtp");
      await verifySmtpConnection();
    }
  }
}
