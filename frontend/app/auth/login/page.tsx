"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input, Button, Modal } from "@/components/ui";
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.292 16.338 7.31 19.5 12 19.5c1.88 0 3.675-.435 5.236-1.216M6.75 6.75A8.96 8.96 0 0 1 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639-.418 2.396-1.66 4.506-3.46 5.978M9.75 9.75l4.5 4.5M9.75 14.25l4.5-4.5M3 3l18 18" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setSuccessMessage("Your password has been updated. You can now sign in.");
    }
  }, []);

  const openForgotPassword = () => {
    setResetEmail(email.trim());
    setResetError(null);
    setResetSuccess(null);
    setForgotOpen(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      const supabase = createClient();
      const { error: resetPasswordError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetPasswordError) {
        setResetError(resetPasswordError.message);
        return;
      }

      setResetSuccess("Password reset link has been sent to your email.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send reset link. Please try again.";
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

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

                {successMessage && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
                    {successMessage}
                  </div>
                )}

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
                  <div className="w-full">
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 transition-colors duration-300 dark:text-slate-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 pr-10 text-gray-900 shadow-sm transition-all duration-300 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors duration-300 hover:text-gray-700 focus:outline-none dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm font-medium text-[#7C3AED] transition-colors duration-300 hover:text-[#6D28D9] hover:underline"
                    >
                      Forgot password?
                    </button>
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

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForgotOpen(false)} disabled={resetLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleForgotPassword} disabled={resetLoading}>
              {resetLoading ? "Sending…" : "Send reset link"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <Input
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-xl border-[#E2E8F0] transition-all duration-300 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20"
          />
          {resetError && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {resetError}
            </p>
          )}
          {resetSuccess && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
              {resetSuccess}
            </p>
          )}
        </form>
      </Modal>
    </main>
  );
}
