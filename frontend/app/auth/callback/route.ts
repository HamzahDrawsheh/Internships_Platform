import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getDashboardPath } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Post-login: ensure profile exists and redirect to role-based dashboard (or onboarding).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("OAuth callback exchangeCodeForSession error:", exchangeError);
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const profile = await ensureProfile();
  const role = profile?.role ?? null;
  const dashboardPath = getDashboardPath(role);

  if (!role) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Redirect to requested path if allowed (protected path), else role dashboard
  const isAllowed =
    next.startsWith("/dashboard") ||
    next.startsWith("/admin") ||
    next.startsWith("/company") ||
    next.startsWith("/supervisor") ||
    next.startsWith("/internships") ||
    next.startsWith("/applications") ||
    next.startsWith("/profile") ||
    next.startsWith("/notifications") ||
    next.startsWith("/onboarding/") ||
    next === "/pending-approval";
  const target = isAllowed ? next : dashboardPath;
  return NextResponse.redirect(new URL(target, request.url));
}
