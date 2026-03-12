"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F3E8FF] via-[#F5EEFF] to-[#EDE9FE] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full overflow-hidden rounded-3xl border border-[#E9D5FF] bg-white shadow-[0_20px_60px_-25px_rgba(124,58,237,0.35)]">
          <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-2">
            <div className="flex items-center justify-center bg-[#F3E8FF] p-8 sm:p-10 lg:p-12">
              <Image
                src="/login_png.png"
                alt="Login illustration"
                width={800}
                height={500}
                className="h-auto w-full max-w-xl object-contain"
                priority
              />
            </div>
            <div className="flex items-center justify-center p-8 sm:p-10 lg:p-12">
              <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-[#0F172A]">Welcome back</h1>
                <p className="mt-2 text-sm text-[#475569]">Sign in with your email and password.</p>

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
                    className="rounded-xl border-[#E2E8F0] focus:border-[#7C3AED] focus:ring-[#7C3AED]/20"
                  />
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#7C3AED] focus:ring-[#7C3AED]/20"
                  />
                  <div className="flex justify-end">
                    <Link href="#" className="text-sm font-medium text-[#7C3AED] hover:text-[#6D28D9]">
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
                    {loading ? "Signing in…" : "Login"}
                  </Button>
                </form>

                <p className="mt-8 text-center text-sm text-[#0F172A]/70">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/signup" className="font-medium text-[#7C3AED] hover:text-[#6D28D9]">Sign up</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
