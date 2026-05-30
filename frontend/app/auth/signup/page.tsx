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

const accountCards: { value: string; label: string; desc: string; icon: SidebarIconName }[] = [
  { value: "student", label: "Student", desc: "Find internships and grow your AI career", icon: "academic" },
  { value: "company", label: "Company", desc: "Post internships and hire talent", icon: "building" },
  { value: "supervisor", label: "Supervisor", desc: "Monitor and support students", icon: "users" },
];

export default function SignupPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const onboardingNextPath =
    role === "company"
      ? "/onboarding/company"
      : role === "supervisor"
        ? "/onboarding/supervisor"
        : null;

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const callbackBase =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback";
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
        setError("Signup failed due to database trigger mismatch. Run the latest Supabase migrations, then try again.");
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

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8 transition-colors duration-300 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Account created</h2>
          <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Check your email to confirm your account.</p>
          <Link
            href={onboardingNextPath ? `/auth/login?next=${encodeURIComponent(onboardingNextPath)}` : "/auth/login"}
            className="mt-6 inline-block"
          >
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </main>
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
            <Link href="/auth/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </nav>
      <div className={NAVBAR_HEIGHT_CLASS} aria-hidden />

      <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-3 transition-colors duration-300 sm:p-4 lg:p-5 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-2xl border border-purple-100 bg-white/80 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/85">
            <div className="relative h-[120px] w-full overflow-hidden sm:h-[150px] lg:h-[180px]">
              <Image
                src="/registration-banner-v2.png"
                alt="AI internship platform registration preview"
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover object-top"
                unoptimized
                priority
              />
            </div>
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="mx-auto max-w-5xl">
                <div className="mb-5">
                  <div className="flex gap-1">
                    <div
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        step >= 1 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-[#E2E8F0] dark:bg-slate-700"
                      }`}
                    />
                    <div
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        step >= 2 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-[#E2E8F0] dark:bg-slate-700"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Step {step} of 2</p>
                </div>

                {step === 1 && (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A] transition-colors duration-300 dark:text-white">Create your account</h1>
                    <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Choose your account type to get started.</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {accountCards.map((card) => (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => setRole(card.value)}
                          className={`rounded-2xl border-2 p-4 text-left transition-all ${
                            role === card.value
                              ? "border-purple-600 bg-purple-50 shadow-lg dark:border-purple-400 dark:bg-purple-500/15"
                              : "border-gray-200 bg-white hover:scale-105 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <SidebarIcon name={card.icon} active={role === card.value} />
                            <span className="font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">{card.label}</span>
                          </span>
                          <p className="mt-2 text-sm leading-5 text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-300">{card.desc}</p>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      className="mt-5 w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3 shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A] transition-colors duration-300 dark:text-white">Your details</h1>
                    <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Account type: {role}</p>
                    {error && (
                      <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300" role="alert">{error}</div>
                    )}
                    <form onSubmit={handleSubmit} className="mt-5 max-w-3xl space-y-3">
                      <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="rounded-xl border-[#E2E8F0]" />
                      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border-[#E2E8F0]" />
                      <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl border-[#E2E8F0]" />
                      <input type="hidden" name="role" value={role} />
                      <div className="flex gap-3">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                        <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                          {loading ? "Creating…" : "Create account"}
                        </Button>
                      </div>
                    </form>
                  </>
                )}

                <p className="mt-5 text-center text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
                  Already have an account? <Link href="/auth/login" className="font-medium text-[#7C3AED] hover:text-[#6D28D9]">Login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
