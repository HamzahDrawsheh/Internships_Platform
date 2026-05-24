"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const accountCards = [
  { value: "student", label: "Student", desc: "Find internships and grow your AI career" },
  { value: "company", label: "Company", desc: "Post internships and hire talent" },
  { value: "supervisor", label: "Supervisor", desc: "Monitor and support students" },
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onboardingNextPath =
    role === "company"
      ? "/onboarding/company"
      : role === "supervisor"
        ? "/onboarding/supervisor"
        : null;

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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 transition-colors duration-300 sm:p-6 lg:p-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full overflow-hidden rounded-2xl border border-purple-100 bg-white/70 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex items-center justify-center bg-[#F3E8FF] p-8 transition-colors duration-300 sm:p-10 lg:p-12 dark:bg-slate-800">
              <Image
                src="/sign_png.png"
                alt="Signup illustration"
                width={500}
                height={500}
                className="animate-float-y h-auto w-full max-w-[500px] object-contain drop-shadow-[0_16px_30px_rgba(124,58,237,0.25)]"
                priority
              />
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="mx-auto max-w-2xl py-4 lg:py-8">
                <div className="mb-8">
                  <div className="flex gap-1">
                    <div
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        step >= 1 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-[#E2E8F0]"
                      }`}
                    />
                    <div
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        step >= 2 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-[#E2E8F0]"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Step {step} of 2</p>
                </div>

                {step === 1 && (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A] transition-colors duration-300 dark:text-white">Create your account</h1>
                    <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Choose your account type to get started.</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      {accountCards.map((card) => (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => setRole(card.value)}
                          className={`rounded-2xl border-2 p-6 text-left transition-all ${
                            role === card.value
                              ? "border-purple-600 bg-purple-50 shadow-lg"
                              : "border-gray-200 bg-white hover:scale-105 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                          }`}
                        >
                          <span className="font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">{card.label}</span>
                          <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">{card.desc}</p>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      className="mt-8 w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3 shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                      <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>
                    )}
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

                <p className="mt-8 text-center text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
                  Already have an account? <Link href="/auth/login" className="font-medium text-[#7C3AED] hover:text-[#6D28D9]">Login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
