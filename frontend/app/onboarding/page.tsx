"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Button } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { api, ApiError } from "@/lib/api";

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

    // Debug: log submission intent
    // eslint-disable-next-line no-console
    console.log("Submitting profile", { name: fullName, role });

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user?.email ?? "";

    if (!session?.user?.id) {
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

    try {
      await api.patch("/profiles/me", { full_name: name, role: role });

      // Debug: log successful update
      // eslint-disable-next-line no-console
      console.log("Profile saved successfully");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error saving profile", err);

      if (err instanceof ApiError && err.status === 0) {
        setError("Could not connect to the backend server. Make sure the API is running.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save profile.");
      }
    } finally {
      setLoading(false);
    }
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
