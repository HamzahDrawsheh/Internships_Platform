import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildMonthlyReportPdf } from "@/lib/internship-reports/pdf-document";
import { REPORT_PDF_BUCKET } from "@/lib/internship-reports/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: report, error: reportError } = await admin
    .from("internship_monthly_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { data: internship } = await admin
    .from("internships")
    .select("*, students(id, user_id, department, university), companies(company_name)")
    .eq("id", report.internship_id)
    .maybeSingle();

  if (!internship) {
    return NextResponse.json({ ok: false, error: "internship_not_found" }, { status: 404 });
  }

  const studentUserId = (internship as { students?: { user_id: string } }).students?.user_id;
  const { data: company } = await admin
    .from("companies")
    .select("user_id, company_name")
    .eq("id", internship.company_id)
    .maybeSingle();

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";
  const isStudent = studentUserId === user.id;
  const isCompany = company?.user_id === user.id;

  let isSupervisor = false;
  if (profile?.role === "supervisor") {
    const { data: sup } = await admin.from("supervisors").select("department").eq("user_id", user.id).maybeSingle();
    const stDept = (internship as { students?: { department?: string } }).students?.department;
    isSupervisor = Boolean(sup?.department && stDept && sup.department.trim() === stDept.trim());
  }

  if (!isStudent && !isCompany && !isSupervisor && !isAdmin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const [{ data: weekly }, { data: attendance }, { data: evaluation }] = await Promise.all([
    admin.from("internship_weekly_reports").select("*").eq("monthly_report_id", reportId).order("week_number"),
    admin.from("internship_attendance").select("*").eq("internship_id", report.internship_id).order("date"),
    admin.from("internship_employer_evaluations").select("*").eq("monthly_report_id", reportId).maybeSingle(),
  ]);

  const { data: studentProfile } = studentUserId
    ? await admin.from("profiles").select("full_name, email").eq("id", studentUserId).maybeSingle()
    : { data: null };

  const [{ data: studentSig }, { data: companySig }] = await Promise.all([
    studentUserId
      ? admin.from("user_signatures").select("signature_data_url").eq("user_id", studentUserId).maybeSingle()
      : Promise.resolve({ data: null }),
    company?.user_id
      ? admin.from("user_signatures").select("signature_data_url").eq("user_id", company.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const pdfBytes = buildMonthlyReportPdf({
    studentName: report.form_student_name ?? studentProfile?.full_name ?? "Student",
    studentId: report.form_student_id ?? studentUserId?.slice(0, 8) ?? "—",
    department: report.form_department ?? (internship as { students?: { department?: string } }).students?.department ?? "—",
    employerName: report.form_employer_name ?? company?.company_name ?? internship.employer_supervisor_name ?? "—",
    universitySupervisor: report.form_university_supervisor ?? internship.university_supervisor_name ?? "—",
    monthNumber: report.month_number,
    periodStart: report.period_start,
    periodEnd: report.period_end,
    assignments: report.assignments ?? "",
    workSummary: report.work_summary ?? "",
    weeklyReports: weekly ?? [],
    attendance: attendance ?? [],
    evaluation: evaluation ?? null,
    studentSignatureDataUrl: studentSig?.signature_data_url,
    employerSignatureDataUrl: companySig?.signature_data_url,
    supervisorComments: report.supervisor_comments,
    status: report.status,
  });

  const path = `${studentUserId}/${report.internship_id}/month-${report.month_number}.pdf`;
  await admin.storage.from(REPORT_PDF_BUCKET).upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  await admin
    .from("internship_monthly_reports")
    .update({ generated_pdf_url: path, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="monthly-report-${report.month_number}.pdf"`,
    },
  });
}
