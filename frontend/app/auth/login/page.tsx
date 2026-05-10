"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input, Button } from "@/components/ui";
import { normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";

function logPostgrestError(scope: string, err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const o = err as { message?: string; code?: string; details?: string; hint?: string };
    console.error(scope, o.message ?? "(no message)", o.code ?? "", o.details ?? "", o.hint ?? "");
    return;
  }
  console.error(scope, err);
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function hasRequiredOnboardingPayload(
  requestedRole: "company" | "supervisor" | null,
  payload: unknown
): boolean {
  if (!requestedRole || !payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;

  if (requestedRole === "company") {
    return typeof record.company_name === "string" && record.company_name.trim().length > 0;
  }

  const deptRaw = typeof record.department === "string" ? record.department.trim() : "";
  const deptOk = deptRaw.length > 0 && normalizeDepartmentAlias(deptRaw) !== null;
  return (
    typeof record.full_name === "string" &&
    record.full_name.trim().length > 0 &&
    typeof record.university === "string" &&
    record.university.trim().length > 0 &&
    deptOk
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      console.log("[login] start", { email });

      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        15000,
        "signInWithPassword"
      );
      console.log("[login] signInWithPassword response", {
        hasUser: Boolean(signInData?.user),
        hasSession: Boolean(signInData?.session),
        error: signInError?.message ?? null,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Ensure the REST client has the session tokens immediately (avoids rare races where
      // the next `.from("profiles")` runs before the browser client attaches the JWT).
      if (signInData.session?.access_token && signInData.session.refresh_token) {
        await supabase.auth.setSession({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        });
      }

      const { data: sessionData, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        "getSession"
      );
      if (sessionError) {
        console.error("[login] getSession error", sessionError);
      }
      if (!sessionData?.session) {
        console.warn("[login] missing session after login");
        setError("Login succeeded but no active session was found. Please try again.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await withTimeout(supabase.auth.getUser(), 10000, "getUser");
      console.log("[login] authenticated user", { userId: user?.id ?? null, error: userError?.message ?? null });

      if (userError) {
        console.error("[login] getUser error", userError);
        setError("Unable to load authenticated user.");
        return;
      }

      if (!user) {
        setError("No authenticated user found after login.");
        return;
      }

      const fetchProfileRole = () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

      let profileResult = await withTimeout(fetchProfileRole(), 10000, "profiles role query");
      if (profileResult.error) {
        logPostgrestError("[login] profile query error (first attempt)", profileResult.error);
        await new Promise((r) => setTimeout(r, 400));
        profileResult = await withTimeout(fetchProfileRole(), 10000, "profiles role query retry");
      }

      const { data: profile, error: profileError } = profileResult;
      console.log("[login] profile query result", { profile, error: profileError?.message ?? null });

      if (profileError) {
        logPostgrestError("[login] profile query error", profileError);
        const pe = profileError as { message?: string; code?: string };
        const ref = [pe.code, pe.message].filter(Boolean).join(" · ") || "unknown";
        setError(
          `Signed in with Supabase Auth, but reading your profile row failed (${ref}). Admin approval only updates data in the database — it does not fix wrong API keys or connection issues. Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY match Dashboard → Settings → API for the same project where your account was approved, then retry.`
        );
        return;
      }

      const role = profile?.role ?? null;
      console.log("[login] role detection", { role });

      const { data: latestUpgradeRequest, error: latestUpgradeRequestError } = await withTimeout(
        (async () =>
          await supabase
            .from("role_upgrade_requests")
            .select("requested_role, status, payload")
            .eq("user_id", user.id)
            .in("requested_role", ["company", "supervisor"])
            .order("submitted_at", { ascending: false })
            .limit(1)
            .maybeSingle())(),
        10000,
        "latest role upgrade request query"
      );
      if (latestUpgradeRequestError) {
        console.error("[login] latest role upgrade request query error", latestUpgradeRequestError);
      }

      const metadataRole =
        user.user_metadata?.role === "company" || user.user_metadata?.role === "supervisor"
          ? user.user_metadata.role
          : null;
      const requestedRole =
        latestUpgradeRequest?.requested_role === "company" || latestUpgradeRequest?.requested_role === "supervisor"
          ? latestUpgradeRequest.requested_role
          : null;
      const hasOnboardingPayload = hasRequiredOnboardingPayload(
        requestedRole,
        latestUpgradeRequest?.payload ?? null
      );
      const intendedRole = role === "student" ? metadataRole ?? requestedRole : null;
      let onboardingTarget: string | null = null;
      if (role === "student" && intendedRole) {
        if (!latestUpgradeRequest) {
          onboardingTarget = intendedRole === "company" ? "/onboarding/company" : "/onboarding/supervisor";
        } else if (latestUpgradeRequest.status === "pending") {
          onboardingTarget = hasOnboardingPayload
            ? "/pending-approval"
            : intendedRole === "company"
              ? "/onboarding/company"
              : "/onboarding/supervisor";
        } else if (latestUpgradeRequest.status === "approved") {
          onboardingTarget = intendedRole === "company" ? "/dashboard/company" : "/dashboard/supervisor";
        } else if (latestUpgradeRequest.status === "rejected") {
          onboardingTarget = intendedRole === "company" ? "/onboarding/company" : "/onboarding/supervisor";
        } else {
          onboardingTarget = intendedRole === "company" ? "/onboarding/company" : "/onboarding/supervisor";
        }
      }

      const nextParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const safeNextPath =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//") &&
        (nextParam.startsWith("/dashboard") ||
          nextParam.startsWith("/admin") ||
          nextParam.startsWith("/company") ||
          nextParam.startsWith("/supervisor") ||
          nextParam.startsWith("/internships") ||
          nextParam.startsWith("/applications") ||
          nextParam.startsWith("/profile") ||
          nextParam.startsWith("/notifications") ||
          nextParam.startsWith("/onboarding/") ||
          nextParam === "/pending-approval")
          ? nextParam
          : null;

      const redirectPath =
        onboardingTarget ??
        safeNextPath ??
        role === "student"
          ? "/dashboard/student"
          : role === "company"
          ? "/dashboard/company"
          : role === "supervisor"
          ? "/dashboard/supervisor"
          : role === "admin"
          ? "/admin/dashboard"
          : "/onboarding";

      console.log("[login] redirect path", { redirectPath });
      console.log("[login] final redirect call", { method: "window.location.assign", redirectPath });
      window.location.assign(redirectPath);
    } catch (err) {
      console.error("[login] unexpected error", err);
      const message = err instanceof Error ? err.message : "Unexpected error during login. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 transition-colors duration-300 sm:p-6 lg:p-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full overflow-hidden rounded-2xl border border-purple-100 bg-white/70 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-2">
            <div className="flex items-center justify-center bg-[#F3E8FF] p-8 transition-colors duration-300 sm:p-10 lg:p-12 dark:bg-slate-800">
              <Image
                src="/login_png.png"
                alt="Login illustration"
                width={800}
                height={500}
                className="animate-float-y h-auto w-full max-w-xl object-contain drop-shadow-[0_16px_30px_rgba(124,58,237,0.25)]"
                priority
              />
            </div>
            <div className="flex items-center justify-center p-8 sm:p-10 lg:p-12">
              <div className="w-full max-w-md py-4 lg:py-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] transition-colors duration-300 sm:text-4xl dark:text-white">Welcome back</h1>
                <p className="mt-3 text-sm text-[#475569] transition-colors duration-300 dark:text-slate-400">Sign in with your email and password.</p>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border-[#E2E8F0] transition-all duration-300 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20"
                  />
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] transition-all duration-300 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20"
                  />
                  <div className="flex justify-end">
                    <Link href="#" className="text-sm font-medium text-[#7C3AED] transition-colors duration-300 hover:text-[#6D28D9] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3 shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    disabled={loading}
                  >
                    {loading ? "Signing in…" : "Login"}
                  </Button>
                </form>

                <p className="mt-8 text-center text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/signup" className="font-medium text-[#7C3AED] transition-colors duration-300 hover:text-[#6D28D9] hover:underline">Sign up</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
