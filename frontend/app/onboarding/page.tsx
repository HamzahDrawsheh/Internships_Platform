"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Button } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const roleOptions: SelectOption[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "supervisor", label: "Supervisor" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
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

    const name = fullName.trim() || (session?.user?.user_metadata?.full_name as string)?.trim() || session?.user?.email?.split("@")[0] || "User";
    if (!name) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      role,
      full_name: name,
      email,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ role, full_name: name, email })
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
    const dashboardPath =
      role === "student"
        ? "/dashboard/student"
        : role === "company"
          ? "/dashboard/company"
          : "/dashboard/supervisor";
    router.push(dashboardPath);
    router.refresh();
  };

  return (
    <main className="py-12">
      <Container className="mx-auto max-w-md">
        <PageHeader
          title="Complete your profile"
          description="Choose your role and confirm your name to continue."
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
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </form>
      </Container>
    </main>
  );
}
