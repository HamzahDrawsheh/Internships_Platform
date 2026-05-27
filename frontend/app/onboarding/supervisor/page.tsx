"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { ApprovalStatusCard } from "@/components/onboarding/ApprovalStatusCard";
import { academicDepartmentSelectOptions, isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";

const departmentOptions = [{ value: "", label: "Select your department" }, ...academicDepartmentSelectOptions];

export default function SupervisorOnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [existingRequestId, setExistingRequestId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<"pending" | "rejected" | null>(null);
  const [latestAdminNotes, setLatestAdminNotes] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const checkSessionAndPending = async () => {
      setChecking(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;
      if (!user) {
        setIsAuthenticated(false);
        setUserId(null);
        setChecking(false);
        return;
      }

      setIsAuthenticated(true);
      setUserId(user.id);
      if (!fullName) {
        const fallbackName =
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          (user.email?.split("@")[0] ?? "");
        setFullName(fallbackName);
      }

      const { data: pendingRequest, error: pendingError } = await supabase
        .from("role_upgrade_requests")
        .select("id, status, admin_notes, payload")
        .eq("user_id", user.id)
        .eq("requested_role", "supervisor")
        .in("status", ["pending", "rejected"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingError) {
        console.error("[Supervisor Onboarding] pending request check error:", pendingError);
        setError("Unable to verify existing requests. Please try again.");
        setChecking(false);
        return;
      }

      if (pendingRequest) {
        setExistingRequestId(pendingRequest.id as string);

        const payload =
          pendingRequest.payload && typeof pendingRequest.payload === "object"
            ? (pendingRequest.payload as Record<string, unknown>)
            : {};
        const payloadFullName =
          typeof payload.full_name === "string" ? payload.full_name.trim() : "";
        const payloadUniversity =
          typeof payload.university === "string" ? payload.university.trim() : "";
        const payloadDepartment =
          typeof payload.department === "string" ? payload.department.trim() : "";

        if (payloadFullName && !fullName) setFullName(payloadFullName);
        if (payloadUniversity && !university) setUniversity(payloadUniversity);
        if (payloadDepartment && !department) {
          const mapped =
            normalizeDepartmentAlias(payloadDepartment) ??
            (isValidDepartment(payloadDepartment.trim()) ? (payloadDepartment.trim() as (typeof academicDepartmentSelectOptions)[number]["value"]) : null);
          if (mapped) setDepartment(mapped);
        }

        if (pendingRequest.status === "pending") {
          setLatestStatus("pending");
          setSubmitted(Boolean(payloadFullName && payloadUniversity && payloadDepartment));
        } else if (pendingRequest.status === "rejected") {
          setLatestStatus("rejected");
          setLatestAdminNotes((pendingRequest.admin_notes as string | null) ?? null);
        }
      }

      setChecking(false);
    };

    checkSessionAndPending();
    // Only hydrate the initial pending request snapshot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated || !userId) {
      setError("Please login to submit onboarding request.");
      return;
    }

    if (!isValidDepartment(department.trim())) {
      setError("Please choose a valid department from the list.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      full_name: fullName.trim(),
      university: university.trim(),
      department: department.trim() as (typeof academicDepartmentSelectOptions)[number]["value"],
    };

    const requestMutation =
      latestStatus === "pending" && existingRequestId
        ? supabase
            .from("role_upgrade_requests")
            .update({
              payload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRequestId)
            .eq("user_id", userId)
            .eq("requested_role", "supervisor")
            .eq("status", "pending")
        : supabase.from("role_upgrade_requests").insert({
            user_id: userId,
            requested_role: "supervisor",
            status: "pending",
            payload,
          });

    const { error: requestError } = await requestMutation;
    setLoading(false);

    if (requestError) {
      console.error("[Supervisor Onboarding] request mutation error:", requestError);
      setError(requestError.message);
      return;
    }

    setLatestStatus("pending");
    setSubmitted(true);
    router.push("/pending-approval");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 transition-colors duration-300 sm:p-6 lg:p-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl items-center justify-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="w-full rounded-2xl border border-purple-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 transition-colors duration-300 dark:text-white">
            Supervisor Onboarding Form
          </h1>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">
            Submit your supervisor details for admin approval.
          </p>

          {checking && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Checking your onboarding status...
            </div>
          )}

          {isAuthenticated === false && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 transition-colors duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Please login first to continue onboarding.{" "}
              <Link href="/auth/login?next=%2Fonboarding%2Fsupervisor" className="font-medium underline">
                Go to Login
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          {isAuthenticated && !checking && latestStatus === "rejected" && !submitted && (
            <ApprovalStatusCard
              requestType="supervisor"
              status="rejected"
              adminNotes={latestAdminNotes}
              showBackButton
            />
          )}

          {isAuthenticated && !checking && submitted ? (
            <ApprovalStatusCard requestType="supervisor" status="pending" showBackButton />
          ) : isAuthenticated && !checking ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Full name"
                placeholder="Your full name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="University"
                placeholder="University of Jordan"
                required
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />
              <Select
                label="Department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={departmentOptions}
              />
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit request"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
