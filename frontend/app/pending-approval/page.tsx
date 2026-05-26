"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { SimplePageSkeleton } from "@/components/loading";
import { ApprovalStatusCard } from "@/components/onboarding/ApprovalStatusCard";
import { createClient } from "@/lib/supabase/client";

type RequestRole = "company" | "supervisor";
type RequestStatus = "pending" | "approved" | "rejected";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestRole, setRequestRole] = useState<RequestRole | null>(null);
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const resolveState = async () => {
      setLoading(true);
      setError(null);

      // Prefer getUser() over getSession(): it validates/refreshes the JWT with the Auth server.
      // getSession() can briefly return null during client hydration or stale/expired tokens → false login redirect.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("[pending-approval] getUser error:", authError.message, authError);
      }

      if (!user) {
        router.replace("/auth/login?next=%2Fpending-approval");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "[pending-approval] profile query error:",
          profileError.message ?? "(no message)",
          profileError.code ?? "",
          profileError.details ?? "",
          profileError.hint ?? "",
        );
        setError("Unable to load your profile. Try refreshing the page or signing in again.");
        setLoading(false);
        return;
      }

      const role = profile?.role ?? null;
      if (role === "company") {
        router.replace("/dashboard/company");
        return;
      }
      if (role === "supervisor") {
        router.replace("/dashboard/supervisor");
        return;
      }
      if (role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      const { data: latestRequest, error: latestRequestError } = await supabase
        .from("role_upgrade_requests")
        .select("requested_role, status, admin_notes")
        .eq("user_id", user.id)
        .in("requested_role", ["company", "supervisor"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRequestError) {
        console.error("[pending-approval] latest request query error:", latestRequestError);
        setError("Unable to load your onboarding request.");
        setLoading(false);
        return;
      }

      const metadataRole =
        user.user_metadata?.role === "company" || user.user_metadata?.role === "supervisor"
          ? (user.user_metadata.role as RequestRole)
          : null;
      const intendedRole =
        latestRequest?.requested_role === "company" || latestRequest?.requested_role === "supervisor"
          ? (latestRequest.requested_role as RequestRole)
          : metadataRole;

      if (!intendedRole) {
        router.replace("/dashboard/student");
        return;
      }

      if (!latestRequest) {
        router.replace(intendedRole === "company" ? "/onboarding/company" : "/onboarding/supervisor");
        return;
      }

      const currentStatus = latestRequest.status as RequestStatus;
      if (currentStatus === "approved") {
        router.replace(intendedRole === "company" ? "/dashboard/company" : "/dashboard/supervisor");
        return;
      }
      if (currentStatus === "rejected") {
        router.replace(intendedRole === "company" ? "/onboarding/company" : "/onboarding/supervisor");
        return;
      }

      setRequestRole(intendedRole);
      setStatus("pending");
      setAdminNotes((latestRequest.admin_notes as string | null) ?? null);
      setLoading(false);
    };

    resolveState();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 transition-colors duration-300 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <Container className="max-w-3xl">
        <PageHeader
          title="Pending Approval"
          description="Your onboarding request is being reviewed by an administrator."
        />

        {loading ? (
          <SimplePageSkeleton />
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : requestRole && status === "pending" ? (
          <ApprovalStatusCard
            requestType={requestRole}
            status="pending"
            adminNotes={adminNotes}
            showBackButton
          />
        ) : null}
      </Container>
    </main>
  );
}
