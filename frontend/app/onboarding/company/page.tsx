"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea } from "@/components/ui";
import { ApprovalStatusCard } from "@/components/onboarding/ApprovalStatusCard";
import { createClient } from "@/lib/supabase/client";

export default function CompanyOnboardingPage() {
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

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

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
      if (!contactEmail) {
        setContactEmail(user.email ?? "");
      }

      const { data: pendingRequest, error: pendingError } = await supabase
        .from("role_upgrade_requests")
        .select("id, status, admin_notes, payload")
        .eq("user_id", user.id)
        .eq("requested_role", "company")
        .in("status", ["pending", "rejected"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingError) {
        console.error("[Company Onboarding] pending request check error:", pendingError);
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
        const payloadCompanyName =
          typeof payload.company_name === "string" ? payload.company_name.trim() : "";
        const payloadDescription =
          typeof payload.description === "string" ? payload.description : "";
        const payloadLocation =
          typeof payload.location === "string" ? payload.location : "";
        const payloadWebsite =
          typeof payload.website === "string" ? payload.website : "";
        const payloadContactEmail =
          typeof payload.contact_email === "string" ? payload.contact_email : "";
        const payloadLogoUrl =
          typeof payload.logo_url === "string" ? payload.logo_url : "";

        if (payloadCompanyName && !companyName) setCompanyName(payloadCompanyName);
        if (payloadDescription && !description) setDescription(payloadDescription);
        if (payloadLocation && !location) setLocation(payloadLocation);
        if (payloadWebsite && !website) setWebsite(payloadWebsite);
        if (payloadContactEmail && !contactEmail) setContactEmail(payloadContactEmail);
        if (payloadLogoUrl && !logoUrl) setLogoUrl(payloadLogoUrl);

        if (pendingRequest.status === "pending") {
          setLatestStatus("pending");
          setSubmitted(Boolean(payloadCompanyName));
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

    setLoading(true);
    const supabase = createClient();

    const payload = {
      company_name: companyName.trim(),
      description: description.trim(),
      location: location.trim(),
      website: website.trim(),
      contact_email: contactEmail.trim(),
      logo_url: logoUrl.trim(),
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
            .eq("requested_role", "company")
            .eq("status", "pending")
        : supabase.from("role_upgrade_requests").insert({
            user_id: userId,
            requested_role: "company",
            status: "pending",
            payload,
          });

    const { error: requestError } = await requestMutation;
    setLoading(false);

    if (requestError) {
      console.error("[Company Onboarding] request mutation error:", requestError);
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
            Company Onboarding Form
          </h1>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">
            Submit your company details for admin approval.
          </p>

          {checking && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Checking your onboarding status...
            </div>
          )}

          {isAuthenticated === false && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 transition-colors duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Please login first to continue onboarding.{" "}
              <Link href="/auth/login?next=%2Fonboarding%2Fcompany" className="font-medium underline">
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
              requestType="company"
              status="rejected"
              adminNotes={latestAdminNotes}
              showBackButton
            />
          )}

          {isAuthenticated && !checking && submitted ? (
            <ApprovalStatusCard requestType="company" status="pending" showBackButton />
          ) : isAuthenticated && !checking ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Company name"
                placeholder="Your company name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Textarea
                label="Description"
                placeholder="Tell students about your company..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                label="Location"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                label="Website"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <Input
                label="Contact email"
                type="email"
                placeholder="hr@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                label="Logo URL"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
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
