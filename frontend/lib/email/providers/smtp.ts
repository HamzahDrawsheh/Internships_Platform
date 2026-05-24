import nodemailer from "nodemailer";

import { getSmtpConfig, type SmtpConfig } from "@/lib/email/config";
import {
  describeSmtpNetworkBlock,
  getErrorCode,
  getErrorMessage,
  isSmtpNetworkError,
} from "@/lib/email/errors";
import {
  markSmtpNetworkBlocked,
  recordSmtpVerifyResult,
} from "@/lib/email/provider-state";
import type { SendEmailParams } from "@/lib/email/types";

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey: string | null = null;

const CONNECTION_TIMEOUT_MS = 15_000;
const GREETING_TIMEOUT_MS = 15_000;
const SOCKET_TIMEOUT_MS = 20_000;

export function createSmtpTransporter(config: SmtpConfig): nodemailer.Transporter {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (cachedTransporter && cachedConfigKey === key) {
    return cachedTransporter;
  }

  console.info("[email][smtp] Creating transporter", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: maskEmail(config.user),
    connectionTimeoutMs: CONNECTION_TIMEOUT_MS,
  });

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    tls: {
      minVersion: "TLSv1.2",
      servername: config.host,
    },
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

export type SmtpVerifyResult =
  | { ok: true; latencyMs: number }
  | { ok: false; networkBlocked: boolean; error: string; code?: string };

/**
 * Tests TCP/TLS + SMTP handshake (no message sent).
 */
export async function verifySmtpConnection(): Promise<SmtpVerifyResult> {
  const config = getSmtpConfig();
  if (!config) {
    const error = "SMTP env vars missing or still placeholders";
    console.warn("[email][smtp] verify skipped:", error);
    recordSmtpVerifyResult(false, error);
    return { ok: false, networkBlocked: false, error };
  }

  console.info("[email][smtp] verify() starting…", {
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  const started = Date.now();
  try {
    const transporter = createSmtpTransporter(config);
    await transporter.verify();
    const latencyMs = Date.now() - started;
    console.info("[email][smtp] verify() OK", { latencyMs });
    recordSmtpVerifyResult(true);
    return { ok: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message = getErrorMessage(error);
    const code = getErrorCode(error);
    const networkBlocked = isSmtpNetworkError(error);

    console.error("[email][smtp] verify() failed", {
      latencyMs,
      code,
      message,
      networkBlocked,
    });

    if (networkBlocked) {
      console.error("[email][smtp]", describeSmtpNetworkBlock(error));
      markSmtpNetworkBlocked(error);
    }

    recordSmtpVerifyResult(false, error);
    return { ok: false, networkBlocked, error: message, code };
  }
}

export async function sendViaSmtp(
  params: SendEmailParams,
  config: SmtpConfig
): Promise<{ ok: true; messageId: string } | { ok: false; error: string; networkBlocked: boolean }> {
  console.info("[email][smtp] sendMail starting", {
    to: params.to,
    subject: params.subject,
    from: config.fromEmail,
  });

  try {
    const transporter = createSmtpTransporter(config);
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    console.info("[email][smtp] sendMail OK", { messageId: info.messageId, to: params.to });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message = getErrorMessage(error);
    const code = getErrorCode(error);
    const networkBlocked = isSmtpNetworkError(error);

    console.error("[email][smtp] sendMail failed", {
      to: params.to,
      subject: params.subject,
      code,
      message,
      networkBlocked,
    });

    if (networkBlocked) {
      console.error("[email][smtp]", describeSmtpNetworkBlock(error));
      markSmtpNetworkBlocked(error);
    }

    return { ok: false, error: message, networkBlocked };
  }
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}
