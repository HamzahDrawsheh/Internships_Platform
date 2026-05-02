"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** Profile role for first-time rows only — never taken from user input (DB / admin-controlled thereafter). */
const INITIAL_PROFILE_ROLE = "student" as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const email = session?.user?.email ?? "";

    if (!userId || !email) {
      setError("You must be signed in to complete your profile.");
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    const name =
      fullName.trim() ||
      (session?.user?.user_metadata?.full_name as string)?.trim() ||
      session?.user?.email?.split("@")[0] ||
      "User";
    if (!name) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      role: INITIAL_PROFILE_ROLE,
      full_name: name,
      email,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ full_name: name, email })
          .eq("id", userId);
        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }
      } else {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/dashboard/student");
    router.refresh();
  };

  return (
    <main className="py-12">
      <Container className="mx-auto max-w-md">
        <PageHeader
          title="Complete your profile"
          description="Confirm your name to continue as a student. Company or supervisor access is granted only through admin-approved onboarding — use the links below if that applies to you."
        />
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <p className="text-sm text-gray-600">
            Need company or supervisor access? Continue through the dedicated flows (admin approval required):{" "}
            <Link href="/onboarding/company" className="font-medium text-purple-700 underline">
              Company onboarding
            </Link>
            {" · "}
            <Link href="/onboarding/supervisor" className="font-medium text-purple-700 underline">
              Supervisor onboarding
            </Link>
            .
          </p>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </form>
      </Container>
    </main>
  );
}
