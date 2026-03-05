"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Input, Select, Button } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const roleOptions: SelectOption[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "supervisor", label: "Supervisor" },
];

export default function SignupPage() {
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
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <main className="py-12">
        <Container className="mx-auto max-w-md">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-green-800">Account created</h2>
            <p className="mt-2 text-sm text-green-700">
              Check your email to confirm your account.
            </p>
            <Link href="/auth/login" className="mt-4 inline-block">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-12">
      <Container className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Sign Up</h1>
        <p className="mt-1 text-sm text-gray-600">Create an account. Choose your role to get started.</p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-gray-900 hover:underline">
            Login
          </Link>
        </p>
      </Container>
    </main>
  );
}
