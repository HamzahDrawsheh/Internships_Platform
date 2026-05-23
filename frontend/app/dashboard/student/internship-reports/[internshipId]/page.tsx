"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinalReportUploadPanel } from "@/components/internship-reports/FinalReportUploadPanel";
import { InternshipProgressCard } from "@/components/internship-reports/InternshipProgressCard";
import { MonthTimeline } from "@/components/internship-reports/MonthTimeline";
import { ReportsPageSkeleton } from "@/components/internship-reports/ReportsPageSkeleton";
import { Button } from "@/components/ui";
import { formatIsoDate } from "@/lib/internship-reports/helpers";
import { FINAL_REPORT_BUCKET, MAX_FINAL_REPORT_BYTES } from "@/lib/internship-reports/constants";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import type { FinalReportRow, InternshipRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

export default function StudentInternshipDetailPage() {
  const params = useParams();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const [internship, setInternship] = useState<InternshipRow | null>(null);
  const [reports, setReports] = useState<MonthlyReportRow[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReportRow | null>(null);
  const [meta, setMeta] = useState({ company: "", title: "" });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!internshipId) return;
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      await syncInternshipReportStatuses(supabase, internshipId);
      const [{ data: i }, { data: reps }, { data: fr }] = await Promise.all([
        supabase.from("internships").select("*").eq("id", internshipId).maybeSingle(),
        supabase.from("internship_monthly_reports").select("*").eq("internship_id", internshipId).order("month_number"),
        supabase.from("internship_final_reports").select("*").eq("internship_id", internshipId).maybeSingle(),
      ]);
      setInternship(i as InternshipRow | null);
      setReports((reps ?? []) as MonthlyReportRow[]);
      setFinalReport((fr ?? null) as FinalReportRow | null);

      if (i?.application_id) {
        const { data: app } = await supabase
          .from("applications")
          .select("internship_positions(title, companies(company_name))")
          .eq("id", i.application_id)
          .maybeSingle();
        const pos = app?.internship_positions as { title?: string; companies?: { company_name?: string } } | null;
        setMeta({ company: pos?.companies?.company_name ?? "", title: pos?.title ?? "" });
      }
      setLoading(false);
    };
    void load();
  }, [internshipId]);

  const handleFinalUpload = async (file: File) => {
    if (!internship) return;
    if (file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FINAL_REPORT_BYTES) {
      setMessage("File exceeds 50MB limit.");
      return;
    }
    setUploading(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }
    const path = `${user.id}/${internship.id}/final-report.pdf`;
    const { error: upErr } = await supabase.storage.from(FINAL_REPORT_BUCKET).upload(path, file, { upsert: true });
    if (upErr) {
      setMessage(upErr.message);
      setUploading(false);
      return;
    }
    const { error: dbErr } = await supabase.from("internship_final_reports").upsert(
      { internship_id: internship.id, pdf_url: path, status: "submitted", uploaded_at: new Date().toISOString() },
      { onConflict: "internship_id" }
    );
    if (dbErr) {
      setMessage(dbErr.message);
    } else {
      setMessage("Final report uploaded successfully.");
      setFinalReport({
        id: "",
        internship_id: internship.id,
        pdf_url: path,
        status: "submitted",
        uploaded_at: new Date().toISOString(),
        reviewed_at: null,
        reviewer_notes: null,
      });
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Final report submitted",
        message: "Your final internship report has been uploaded.",
        type: "final_report_submitted",
        is_read: false,
        related_internship_id: internship.id,
      });
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <main className="py-8">
        <Container><ReportsPageSkeleton /></Container>
      </main>
    );
  }

  if (!internship) {
    return (
      <main className="py-8">
        <Container>
          <p className="text-sm text-gray-600 dark:text-gray-300">Internship not found.</p>
          <Link href="/dashboard/student/internship-reports" className="mt-2 inline-block text-sm text-purple-600 hover:underline">
            ← Back to reports
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title={meta.title || "Internship timeline"}
          description={`${meta.company} · ${formatIsoDate(internship.start_date)} → ${formatIsoDate(internship.end_date)}`}
        />
        <Link href="/dashboard/student/internship-reports" className="text-sm text-purple-600 hover:underline">
          ← Back to reports
        </Link>

        <div className="mt-6 space-y-6">
          <InternshipProgressCard
            reports={reports}
            startDate={internship.start_date}
            endDate={internship.end_date}
            internshipStatus={internship.status}
          />

          <MonthTimeline
            reports={reports}
            internshipId={internshipId}
            role="student"
            basePath="/dashboard/student/internship-reports"
          />

          <FinalReportUploadPanel
            reports={reports}
            endDate={internship.end_date}
            internshipStatus={internship.status}
            finalReport={finalReport}
            uploading={uploading}
            onUpload={handleFinalUpload}
          />

          {message && (
            <p className="text-sm text-gray-600" aria-live="polite">
              {message}
            </p>
          )}

          <Link href="/dashboard/student/internship-reports">
            <Button variant="primary">Back to monthly reports</Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
