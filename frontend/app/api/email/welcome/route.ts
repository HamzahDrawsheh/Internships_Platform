import { NextResponse } from "next/server";
import { logEmailConfigurationStatus } from "@/lib/email/log-email-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/send";
import { consumeIpRateLimitSlot } from "@/lib/server/ip-rate-limit";

const WELCOME_RATE_LIMIT_BUCKET = "welcome_email";
const MAX_WELCOME_REQUESTS_PER_IP = 8;
const WELCOME_WINDOW_MS = 60 * 60 * 1000;
const RECENT_SIGNUP_MS = 30 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    logEmailConfigurationStatus();

    const ip = getClientIp(request);
    if (
      !consumeIpRateLimitSlot(
        ip,
        WELCOME_RATE_LIMIT_BUCKET,
        MAX_WELCOME_REQUESTS_PER_IP,
        WELCOME_WINDOW_MS
      )
    ) {
      console.warn("[welcome-email] rate limit exceeded", { ip });
      return NextResponse.json({ ok: true });
    }

    const body = (await request.json()) as { email?: string; fullName?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName =
      typeof body.fullName === "string" && body.fullName.trim().length > 0
        ? body.fullName.trim()
        : null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: true });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("[welcome-email] admin client unavailable:", error);
      return NextResponse.json({ ok: true });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, created_at")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("[welcome-email] profile lookup failed:", profileError);
      return NextResponse.json({ ok: true });
    }

    if (!profile?.created_at) {
      return NextResponse.json({ ok: true });
    }

    const createdAt = new Date(profile.created_at).getTime();
    if (Number.isNaN(createdAt) || Date.now() - createdAt > RECENT_SIGNUP_MS) {
      return NextResponse.json({ ok: true });
    }

    const recipientName = fullName ?? profile.full_name ?? null;
    const result = await sendWelcomeEmail({ to: email, recipientName });

    if (result.ok) {
      console.info("[welcome-email] sent", {
        email,
        messageId: result.messageId,
        provider: result.provider,
      });
    } else if (result.reason === "not_configured") {
      console.warn("[welcome-email] skipped — no email provider configured", { email });
    } else {
      console.error("[welcome-email] send failed", {
        email,
        error: result.error,
        provider: result.provider,
        smtpNetworkBlocked: result.smtpNetworkBlocked,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[welcome-email] unexpected error:", error);
    return NextResponse.json({ ok: true });
  }
}
