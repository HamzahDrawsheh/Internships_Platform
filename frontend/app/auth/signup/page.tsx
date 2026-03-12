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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
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
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F172A]">Account created</h2>
          <p className="mt-2 text-sm text-[#0F172A]/70">Check your email to confirm your account.</p>
          <Link href="/auth/login" className="mt-6 inline-block">
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full overflow-hidden rounded-3xl border border-[#E9D5FF] bg-white shadow-[0_20px_60px_-25px_rgba(124,58,237,0.35)]">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex items-center justify-center bg-[#F3E8FF] p-8 sm:p-10 lg:p-12">
              <Image
                src="/sign_png.png"
                alt="Signup illustration"
                width={500}
                height={500}
                className="h-auto w-full max-w-[500px] object-contain"
                priority
              />
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                  <div className="flex gap-1">
                    <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-[#7C3AED]" : "bg-[#E2E8F0]"}`} />
                    <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-[#7C3AED]" : "bg-[#E2E8F0]"}`} />
                  </div>
                  <p className="mt-2 text-sm text-[#0F172A]/70">Step {step} of 2</p>
                </div>

                {step === 1 && (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A]">Create your account</h1>
                    <p className="mt-2 text-sm text-[#0F172A]/70">Choose your account type to get started.</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      {accountCards.map((card) => (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => setRole(card.value)}
                          className={`rounded-2xl border-2 p-6 text-left transition-all ${
                            role === card.value
                              ? "border-[#7C3AED] bg-[#F3E8FF]"
                              : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]/50"
                          }`}
                        >
                          <span className="font-semibold text-[#0F172A]">{card.label}</span>
                          <p className="mt-2 text-sm text-[#0F172A]/70">{card.desc}</p>
                        </button>
                      ))}
                    </div>
                    <Button variant="primary" className="mt-8 w-full py-3" onClick={() => setStep(2)}>
                      Continue
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A]">Your details</h1>
                    <p className="mt-2 text-sm text-[#0F172A]/70">Account type: {role}</p>
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

                <p className="mt-8 text-center text-sm text-[#0F172A]/70">
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
