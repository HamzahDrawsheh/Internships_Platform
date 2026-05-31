"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Input, Button, Modal } from "@/components/ui";
import { normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";
import { SidebarIcon } from "@/components/layout/SidebarIcon";
import { AppBrand } from "@/components/layout/AppBrand";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { NAVBAR_CLASS, NAVBAR_HEIGHT_CLASS } from "@/components/layout/RoleShell";
import { NAV_ICON_BUTTON_CLASS } from "@/components/layout/navControlStyles";
import { useI18n } from "@/lib/i18n/context";

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

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function IconShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-6 w-6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function IconCheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-4 w-4" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconGoogle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden className="h-5 w-5" {...props}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginSpinner() {
  return <span className="login-spinner" aria-hidden="true" />;
}

const LOGIN_FIELD_CLASS =
  "login-input-field block w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-white/10";

export default function LoginPage() {
  const { theme, setTheme } = useTheme();
  const { t, dir } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setSuccessMessage(t("auth.login.passwordUpdated"));
    }
    const oauthError = params.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [t]);

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
      setResetError(t("auth.login.resetEmailRequired"));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setResetError(t("auth.login.resetEmailInvalid"));
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

      setResetSuccess(t("auth.login.resetSuccess"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.login.resetErrorGeneric");
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      if (
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//")
      ) {
        callbackUrl.searchParams.set("next", nextParam);
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.login.googleError");
      setError(message);
      setGoogleLoading(false);
    }
  };

  const heroFeatures = [
    t("auth.login.featureSecurity"),
    t("auth.login.featurePrivate"),
    t("auth.login.featureTrusted"),
  ];

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
    <>
      <nav id="site-navbar" data-i18n-skip dir="ltr" className={`${NAVBAR_CLASS} ${NAVBAR_HEIGHT_CLASS}`}>
        <div className={`mx-auto flex ${NAVBAR_HEIGHT_CLASS} w-full max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6`}>
          <AppBrand href="/" className="shrink-0" />
          <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={NAV_ICON_BUTTON_CLASS}
              aria-label={themeMounted && theme === "dark" ? t("common.switchToLight") : t("common.switchToDark")}
            >
              <SidebarIcon name={themeMounted && theme === "dark" ? "sun" : "moon"} />
              <span className="hidden md:inline">{themeMounted && theme === "dark" ? t("common.light") : t("common.dark")}</span>
            </button>
            <Link href="/auth/signup" className="rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white shadow-md transition-colors duration-300 hover:bg-[#6D28D9] sm:px-4">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </nav>
      <div className={NAVBAR_HEIGHT_CLASS} aria-hidden />

      <main
        dir={dir}
        className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-3 py-6 transition-colors duration-300 sm:px-4 sm:py-8 lg:px-8 dark:from-[#07050f] dark:via-[#07050f] dark:to-[#0a0614]"
      >
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/20" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/15" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />

        <div className="relative mx-auto flex max-w-6xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-3xl border border-purple-200/80 bg-white/85 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-purple-500/20 dark:bg-slate-950/60 dark:shadow-[0_0_60px_rgba(124,58,237,0.15)] lg:min-h-[680px] lg:grid-cols-2">
            {/* Left visual panel */}
            <div className="relative min-h-[240px] sm:min-h-[320px] lg:min-h-full">
              <Image
                src="/login_png.png"
                alt={t("auth.login.imageAlt")}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-purple-900/40 to-purple-800/20 dark:from-[#07050f]/95 dark:via-[#12081f]/50 dark:to-[#1a0b2e]/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/20 lg:to-white/40 dark:to-[#07050f]/30 dark:lg:to-[#07050f]/60" />

              <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-100 backdrop-blur-sm dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-200">
                    <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" aria-hidden />
                    {t("auth.login.brandName")}
                  </p>
                </div>

                <div className="mt-auto max-w-md">
                  <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                    {t("auth.login.heroHeadline")}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base dark:text-slate-300">
                    {t("auth.login.heroSubtitle")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 login-animate-float">
                    {heroFeatures.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      >
                        <IconCheckCircle className="text-purple-200 dark:text-purple-300" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right login form */}
            <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
              <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white/90 p-6 shadow-lg shadow-purple-100/50 backdrop-blur-md transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8">
                <div className="login-animate-float mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-600 shadow-md shadow-purple-200/50 transition-colors duration-300 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300 dark:shadow-[0_0_20px_rgba(124,58,237,0.25)]">
                  <IconShieldCheck />
                </div>

                <div className="text-center">
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{t("auth.login.welcomeBack")}</h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("auth.login.subtitle")}</p>
                </div>

                {successMessage && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
                    {successMessage}
                  </div>
                )}

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
                        <IconMail />
                      </span>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.login.emailPlaceholder")}
                        className={LOGIN_FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
                        <IconLock />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${LOGIN_FIELD_CLASS} pe-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none dark:hover:text-slate-200"
                        aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 bg-white text-purple-600 focus:ring-purple-500/40 dark:border-white/20 dark:bg-white/5"
                      />
                      {t("auth.login.rememberMe")}
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-700 hover:underline dark:text-purple-300 dark:hover:text-purple-200"
                    >
                      {t("auth.login.forgotPassword")}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="login-btn-glow flex w-full items-center justify-center gap-2 border-0 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] py-3"
                    disabled={loading || googleLoading}
                  >
                    {loading && <LoginSpinner />}
                    {loading ? t("auth.login.loggingIn") : t("auth.login.loginButton")}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-slate-200 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-white px-3 text-slate-500 dark:bg-transparent dark:text-slate-500">{t("auth.login.or")}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  {googleLoading ? <LoginSpinner /> : <IconGoogle />}
                  {googleLoading ? t("auth.login.connectingGoogle") : t("auth.login.continueGoogle")}
                </button>

                <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                  {t("auth.login.noAccount")}{" "}
                  <Link href="/auth/signup" className="font-medium text-purple-600 transition-colors hover:text-purple-700 hover:underline dark:text-purple-300 dark:hover:text-purple-200">
                    {t("auth.login.createAccount")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={t("auth.login.resetTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForgotOpen(false)} disabled={resetLoading}>
              {t("auth.login.resetCancel")}
            </Button>
            <Button variant="primary" onClick={handleForgotPassword} disabled={resetLoading}>
              {resetLoading ? t("auth.login.resetSending") : t("auth.login.resetSend")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {t("auth.login.resetDescription")}
          </p>
          <Input
            label={t("auth.email")}
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder={t("auth.login.emailPlaceholder")}
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
    </>
  );
}
