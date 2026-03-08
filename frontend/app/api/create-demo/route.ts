import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_PASSWORD = "12345678";

const DEMO_STUDENTS = [
  { email: "demo_student1@test.com", full_name: "Demo Student 1" },
  { email: "demo_student2@test.com", full_name: "Demo Student 2" },
  { email: "demo_student3@test.com", full_name: "Demo Student 3" },
  { email: "demo_student4@test.com", full_name: "Demo Student 4" },
  { email: "demo_student5@test.com", full_name: "Demo Student 5" },
];

const DEMO_COMPANIES = [
  { email: "demo_company1@test.com", full_name: "Demo Company 1" },
  { email: "demo_company2@test.com", full_name: "Demo Company 2" },
  { email: "demo_company3@test.com", full_name: "Demo Company 3" },
];

const DEMO_INTERNSHIP = {
  title: "Software Engineering Intern",
  description: "Work on real projects",
  location_type: "remote" as const,
  skills: ["JavaScript", "React"],
  duration_weeks: 12,
  open_positions: 3,
  status: "active" as const,
};

export async function POST() {
  try {
    const supabase = createAdminClient();

    const studentIds: string[] = [];
    for (const s of DEMO_STUDENTS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: s.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: s.full_name, role: "student" },
      });
      if (error) {
        if (error.message?.includes("already been registered") || error.code === "user_already_exists") {
          continue;
        }
        console.error("Create demo student error:", s.email, error);
        return NextResponse.json(
          { error: `Failed to create student ${s.email}: ${error.message}` },
          { status: 500 }
        );
      }
      if (data?.user?.id) studentIds.push(data.user.id);
    }

    const companyIds: string[] = [];
    for (const c of DEMO_COMPANIES) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: c.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: c.full_name, role: "company" },
      });
      if (error) {
        if (error.message?.includes("already been registered") || error.code === "user_already_exists") {
          continue;
        }
        console.error("Create demo company error:", c.email, error);
        return NextResponse.json(
          { error: `Failed to create company ${c.email}: ${error.message}` },
          { status: 500 }
        );
      }
      if (data?.user?.id) companyIds.push(data.user.id);
    }

    const profilesToInsert: { id: string; email: string; full_name: string; role: string; is_suspended: boolean }[] = [];
    DEMO_STUDENTS.forEach((s, i) => {
      if (studentIds[i]) {
        profilesToInsert.push({
          id: studentIds[i],
          email: s.email,
          full_name: s.full_name,
          role: "student",
          is_suspended: false,
        });
      }
    });
    DEMO_COMPANIES.forEach((c, i) => {
      if (companyIds[i]) {
        profilesToInsert.push({
          id: companyIds[i],
          email: c.email,
          full_name: c.full_name,
          role: "company",
          is_suspended: false,
        });
      }
    });

    if (profilesToInsert.length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilesToInsert, { onConflict: "id" });
      if (profileError) {
        for (const row of profilesToInsert) {
          const { error: insertError } = await supabase.from("profiles").insert(row);
          if (insertError && insertError.code !== "23505") {
            console.error("Profiles insert error:", insertError);
            return NextResponse.json(
              { error: `Failed to create profiles: ${insertError.message}` },
              { status: 500 }
            );
          }
        }
      }
    }

    const companyProfileIds = companyIds.filter(Boolean);
    for (const companyId of companyProfileIds) {
      const { error: internshipError } = await supabase.from("internships").insert({
        company_id: companyId,
        ...DEMO_INTERNSHIP,
      });
      if (internshipError && internshipError.code !== "23505") {
        console.error("Internship insert error:", internshipError);
        return NextResponse.json(
          { error: `Failed to create internship: ${internshipError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Demo accounts created",
      students: studentIds.length,
      companies: companyIds.length,
    });
  } catch (err) {
    console.error("Create demo error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Create demo failed: ${message}` },
      { status: 500 }
    );
  }
}
