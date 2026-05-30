"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function initSession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError("Invalid or expired reset link. Please request a new one.");
          setCheckingSession(false);
          return;
        }
        if (!cancelled) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setSessionReady(Boolean(session));
        if (!session) {
          setError("Invalid or expired reset link. Please request a new one.");
        }
        setCheckingSession(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionReady(true);
        setError(null);
        setCheckingSession(false);
      }
    });

    void initSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      router.push("/auth/login?reset=success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update password. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 transition-colors duration-300 sm:p-6 lg:p-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full overflow-hidden rounded-2xl border border-purple-100 bg-white/70 p-8 shadow-xl backdrop-blur-xl transition-colors duration-300 sm:p-10 dark:border-slate-800 dark:bg-slate-900/80">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] transition-colors duration-300 dark:text-white">
            Set new password
          </h1>
          <p className="mt-3 text-sm text-[#475569] transition-colors duration-300 dark:text-slate-400">
            Enter your new password below.
          </p>

          {checkingSession && (
            <p className="mt-5 text-sm text-[#475569] dark:text-slate-400">Verifying reset link…</p>
          )}

          {error && !checkingSession && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {error}
              {!sessionReady && (
                <p className="mt-2">
                  <Link href="/auth/login" className="font-medium text-[#7C3AED] hover:underline">
                    Back to login
                  </Link>
                </p>
              )}
            </div>
          )}

          {sessionReady && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="w-full">
                <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700 transition-colors duration-300 dark:text-slate-300">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
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

              <div className="w-full">
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700 transition-colors duration-300 dark:text-slate-300">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 pr-10 text-gray-900 shadow-sm transition-all duration-300 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors duration-300 hover:text-gray-700 focus:outline-none dark:text-slate-400 dark:hover:text-slate-200"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3 shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                disabled={loading}
              >
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
            <Link href="/auth/login" className="font-medium text-[#7C3AED] transition-colors duration-300 hover:text-[#6D28D9] hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
