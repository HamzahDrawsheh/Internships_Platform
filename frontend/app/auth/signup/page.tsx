"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { SidebarIcon, type SidebarIconName } from "@/components/layout/SidebarIcon";
import { AppBrand } from "@/components/layout/AppBrand";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { NAVBAR_CLASS, NAVBAR_HEIGHT_CLASS } from "@/components/layout/RoleShell";
import { NAV_ICON_BUTTON_CLASS } from "@/components/layout/navControlStyles";
import { useI18n } from "@/lib/i18n/context";

const roleOptions: { value: string; labelKey: string; descKey: string; icon: SidebarIconName }[] = [
  { value: "student", labelKey: "auth.signup.student", descKey: "auth.signup.studentDesc", icon: "academic" },
  { value: "company", labelKey: "auth.signup.company", descKey: "auth.signup.companyDesc", icon: "building" },
  { value: "supervisor", labelKey: "auth.signup.supervisor", descKey: "auth.signup.supervisorDesc", icon: "users" },
];

function IconUserPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-6 w-6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
  );
}

function IconCheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function SignupSpinner() {
  return <span className="login-spinner" aria-hidden="true" />;
}

function SignupShell({
  children,
  dir,
  heroPhrase,
  heroChips,
  imageAlt,
}: {
  children: React.ReactNode;
  dir: "ltr" | "rtl";
  heroPhrase: string;
  heroChips: string[];
  imageAlt: string;
}) {
  return (
    <main
      dir={dir}
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-3 py-6 transition-colors duration-300 sm:px-4 sm:py-8 lg:px-8 dark:from-[#07050f] dark:via-[#07050f] dark:to-[#0a0614]"
    >
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/20" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />

      <div className="relative mx-auto flex max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-purple-200/80 bg-white/85 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-purple-500/20 dark:bg-slate-950/60 dark:shadow-[0_0_60px_rgba(124,58,237,0.15)] lg:min-h-[680px] lg:grid-cols-2">
          <div className="relative min-h-[240px] sm:min-h-[320px] lg:min-h-full">
            <Image
              src="/sign_png.png"
              alt={imageAlt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-purple-900/40 to-purple-800/20 dark:from-[#07050f]/95 dark:via-[#12081f]/50 dark:to-[#1a0b2e]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/20 lg:to-white/40 dark:to-[#07050f]/30 dark:lg:to-[#07050f]/60" />

            <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 lg:p-10">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{heroPhrase}</h2>
                <div className="login-animate-float mt-5 flex flex-wrap gap-2">
                  {heroChips.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <IconCheckCircle className="h-4 w-4 text-purple-200 dark:text-purple-300" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  const { theme, setTheme } = useTheme();
  const { t, dir } = useI18n();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);

  const onboardingNextPath =
    role === "company" ? "/onboarding/company" : role === "supervisor" ? "/onboarding/supervisor" : null;

  const heroChips = [
    t("auth.signup.chipSmartMatching"),
    t("auth.signup.chipVerifiedProfiles"),
    t("auth.signup.chipCareerGrowth"),
  ];

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleContinue = () => {
    setContinueLoading(true);
    window.requestAnimationFrame(() => {
      setStep(2);
      setContinueLoading(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const callbackBase =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "/auth/callback";
    const emailRedirectTo = onboardingNextPath
      ? `${callbackBase}?next=${encodeURIComponent(onboardingNextPath)}`
      : callbackBase;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role }, emailRedirectTo },
    });
    setLoading(false);
    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("database error saving new user")) {
        setError(t("auth.signup.signupDbError"));
      } else {
        setError(signUpError.message);
      }
      return;
    }
    setSuccess(true);

    void fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fullName: fullName.trim() || undefined,
      }),
    }).catch((err) => {
      console.error("welcome email request failed:", err);
    });
  };

  const progressPercent = step === 1 ? 50 : 100;
  const stepLabel = step === 1 ? t("auth.signup.step1Of2") : t("auth.signup.step2Of2");
  const selectedRoleLabel =
    role === "company"
      ? t("auth.signup.company")
      : role === "supervisor"
        ? t("auth.signup.supervisor")
        : t("auth.signup.student");

  const cardClass =
    "w-full max-w-md rounded-2xl border border-purple-100 bg-white/90 p-6 shadow-lg shadow-purple-100/50 backdrop-blur-md transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8";

  if (success) {
    return (
      <>
        <nav id="site-navbar" data-i18n-skip dir="ltr" className={`${NAVBAR_CLASS} ${NAVBAR_HEIGHT_CLASS}`}>
          <div className={`mx-auto flex ${NAVBAR_HEIGHT_CLASS} w-full max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6`}>
            <AppBrand href="/" className="shrink-0" />
            <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <LanguageToggle />
              <Link href="/auth/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                {t("nav.login")}
              </Link>
            </div>
          </div>
        </nav>
        <div className={NAVBAR_HEIGHT_CLASS} aria-hidden />
        <SignupShell dir={dir} heroPhrase={t("auth.signup.heroPhrase")} heroChips={heroChips} imageAlt={t("auth.signup.imageAlt")}>
          <div className={`${cardClass} text-center`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("auth.signup.accountCreated")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("auth.signup.checkEmail")}</p>
            <Link
              href={onboardingNextPath ? `/auth/login?next=${encodeURIComponent(onboardingNextPath)}` : "/auth/login"}
              className="mt-6 inline-block"
            >
              <Button variant="primary" className="login-btn-glow bg-gradient-to-r from-[#7C3AED] to-[#6366F1]">
                {t("auth.signup.goToLogin")}
              </Button>
            </Link>
          </div>
        </SignupShell>
      </>
    );
  }

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
            <Link
              href="/auth/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </nav>
      <div className={NAVBAR_HEIGHT_CLASS} aria-hidden />

      <SignupShell dir={dir} heroPhrase={t("auth.signup.heroPhrase")} heroChips={heroChips} imageAlt={t("auth.signup.imageAlt")}>
        <div className={cardClass}>
          <div className="login-animate-float mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-600 shadow-md shadow-purple-200/50 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300 dark:shadow-[0_0_20px_rgba(124,58,237,0.25)]">
            <IconUserPlus />
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-300">{stepLabel}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6366F1] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={stepLabel}
              />
            </div>
          </div>

          {step === 1 && (
            <>
              <div className="text-center sm:text-start">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{t("auth.signup.createTitle")}</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("auth.signup.createSubtitle")}</p>
              </div>

              <div className="mt-6 space-y-3" role="radiogroup" aria-label={t("auth.signup.selectRole")}>
                {roleOptions.map((card) => {
                  const selected = role === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRole(card.value)}
                      className={`signup-role-card w-full rounded-2xl border p-4 text-start ${
                        selected
                          ? "signup-role-card-selected"
                          : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-200/80 bg-purple-50 text-purple-600 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300">
                            <SidebarIcon name={card.icon} active={selected} />
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{t(card.labelKey)}</span>
                            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{t(card.descKey)}</p>
                          </div>
                        </div>
                        {selected && (
                          <span className="shrink-0 text-purple-500 dark:text-purple-300" aria-hidden>
                            <IconCheckCircle />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="primary"
                className="login-btn-glow mt-6 flex w-full items-center justify-center gap-2 border-0 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] py-3"
                onClick={handleContinue}
                disabled={continueLoading}
              >
                {continueLoading && <SignupSpinner />}
                {continueLoading ? t("auth.signup.continuing") : t("auth.signup.continue")}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center sm:text-start">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{t("auth.signup.detailsTitle")}</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t("auth.signup.accountType")}: {selectedRoleLabel}
                </p>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <Input
                  label={t("auth.signup.fullName")}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth.signup.fullNamePlaceholder")}
                  className="login-input-field rounded-xl border-[#E2E8F0] dark:border-white/10"
                />
                <Input
                  label={t("auth.email")}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.login.emailPlaceholder")}
                  className="login-input-field rounded-xl border-[#E2E8F0] dark:border-white/10"
                />
                <Input
                  label={t("auth.password")}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input-field rounded-xl border-[#E2E8F0] dark:border-white/10"
                />
                <input type="hidden" name="role" value={role} />
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)} disabled={loading}>
                    {t("auth.signup.back")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="login-btn-glow flex flex-1 items-center justify-center gap-2 border-0 bg-gradient-to-r from-[#7C3AED] to-[#6366F1]"
                    disabled={loading}
                  >
                    {loading && <SignupSpinner />}
                    {loading ? t("auth.signup.creating") : t("auth.signup.createAccount")}
                  </Button>
                </div>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {t("auth.signup.alreadyHaveAccount")}{" "}
            <Link href="/auth/login" className="font-medium text-purple-600 hover:text-purple-700 hover:underline dark:text-purple-300 dark:hover:text-purple-200">
              {t("auth.signup.loginLink")}
            </Link>
          </p>
        </div>
      </SignupShell>
    </>
  );
}
