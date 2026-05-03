import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

type StudentRow = {
  id: string;
  user_id: string;
  department: string | null;
  university: string | null;
  major: string | null;
  skills: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type StudentAdditionalInfoRow = {
  user_id: string;
  gpa: number | null;
  technical_skills: string[] | null;
  soft_skills: string[] | null;
  taken_courses: string[] | null;
  preferred_field: string | null;
  preferred_location: string | null;
  preferred_work_type: string | null;
  availability: string | null;
  custom_courses: string[] | null;
};

type InternshipRow = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  requirements: string | null;
};

type CompanyRow = {
  id: string;
  company_name: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

function asList(value: string[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) return "Not specified";
  return value.filter(Boolean).join(", ");
}

function asValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "Not specified";
  const text = String(value).trim();
  return text.length > 0 ? text : "Not specified";
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function buildStudentEmbeddingText(input: {
  profile: ProfileRow | undefined;
  student: StudentRow;
  additional: StudentAdditionalInfoRow | undefined;
}): string {
  const { profile, student, additional } = input;

  return [
    `Student Name: ${asValue(profile?.full_name)}`,
    `Student Email: ${asValue(profile?.email)}`,
    `Department: ${asValue(student.department)}`,
    `University: ${asValue(student.university)}`,
    `Major: ${asValue(student.major)}`,
    `Skills: ${asValue(student.skills)}`,
    `GPA: ${asValue(additional?.gpa)}`,
    `Technical Skills: ${asList(additional?.technical_skills)}`,
    `Soft Skills: ${asList(additional?.soft_skills)}`,
    `Taken Courses: ${asList(additional?.taken_courses)}`,
    `Preferred Field: ${asValue(additional?.preferred_field)}`,
    `Preferred Location: ${asValue(additional?.preferred_location)}`,
    `Preferred Work Type: ${asValue(additional?.preferred_work_type)}`,
    `Availability: ${asValue(additional?.availability)}`,
    `Custom Courses: ${asList(additional?.custom_courses)}`,
  ].join("\n");
}

export function buildInternshipEmbeddingText(input: {
  internship: InternshipRow;
  company: CompanyRow | undefined;
}): string {
  const { internship, company } = input;
  return [
    `Internship Title: ${asValue(internship.title)}`,
    `Description: ${asValue(internship.description)}`,
    `Requirements: ${asValue(internship.requirements)}`,
    `Company: ${asValue(company?.company_name)}`,
  ].join("\n");
}

async function generateEmbedding(input: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("OpenAI returned an invalid embedding");
  }

  return embedding;
}

export async function generateStudentEmbeddingsForAll() {
  const supabase = createAdminClient();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, user_id, department, university, major, skills");
  if (studentsError) throw studentsError;

  const studentRows = (students ?? []) as StudentRow[];
  if (studentRows.length === 0) {
    return { total: 0, updated: 0 };
  }

  const userIds = [...new Set(studentRows.map((row) => row.user_id))];

  const [{ data: profiles, error: profilesError }, { data: additionalInfo, error: additionalError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, email").in("id", userIds),
      supabase
        .from("student_additional_info")
        .select(
          "user_id, gpa, technical_skills, soft_skills, taken_courses, preferred_field, preferred_location, preferred_work_type, availability, custom_courses"
        )
        .in("user_id", userIds),
    ]);

  if (profilesError) throw profilesError;
  if (additionalError) throw additionalError;

  const profileMap = new Map((profiles ?? []).map((row: ProfileRow) => [row.id, row]));
  const additionalMap = new Map(
    (additionalInfo ?? []).map((row: StudentAdditionalInfoRow) => [row.user_id, row])
  );

  let updated = 0;
  for (const student of studentRows) {
    const text = buildStudentEmbeddingText({
      profile: profileMap.get(student.user_id),
      student,
      additional: additionalMap.get(student.user_id),
    });
    const embedding = await generateEmbedding(text);

    const { error: updateError } = await supabase
      .from("students")
      .update({
        embedding: toVectorLiteral(embedding),
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return { total: studentRows.length, updated };
}

export async function generateInternshipEmbeddingsForAll() {
  const supabase = createAdminClient();

  const { data: internships, error: internshipsError } = await supabase
    .from("internship_positions")
    .select("id, company_id, title, description, requirements");
  if (internshipsError) throw internshipsError;

  const internshipRows = (internships ?? []) as InternshipRow[];
  if (internshipRows.length === 0) {
    return { total: 0, updated: 0 };
  }

  const companyIds = [...new Set(internshipRows.map((row) => row.company_id))];
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, company_name")
    .in("id", companyIds);
  if (companiesError) throw companiesError;

  const companyMap = new Map((companies ?? []).map((row: CompanyRow) => [row.id, row]));

  let updated = 0;
  for (const internship of internshipRows) {
    const text = buildInternshipEmbeddingText({
      internship,
      company: companyMap.get(internship.company_id),
    });
    const embedding = await generateEmbedding(text);

    const { error: updateError } = await supabase
      .from("internship_positions")
      .update({
        embedding: toVectorLiteral(embedding),
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", internship.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return { total: internshipRows.length, updated };
}

export async function generateStudentEmbeddingByStudentId(studentId: string) {
  const supabase = createAdminClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, user_id, department, university, major, skills")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    throw studentError;
  }
  if (!student) {
    return { updated: false as const };
  }

  const row = student as StudentRow;

  const [{ data: profile, error: profileError }, { data: additional, error: additionalError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("id", row.user_id).maybeSingle(),
      supabase
        .from("student_additional_info")
        .select(
          "user_id, gpa, technical_skills, soft_skills, taken_courses, preferred_field, preferred_location, preferred_work_type, availability, custom_courses"
        )
        .eq("user_id", row.user_id)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw profileError;
  }
  if (additionalError) {
    throw additionalError;
  }

  const text = buildStudentEmbeddingText({
    profile: profile as ProfileRow | undefined,
    student: row,
    additional: additional as StudentAdditionalInfoRow | undefined,
  });
  const embedding = await generateEmbedding(text);

  const { error: updateError } = await supabase
    .from("students")
    .update({
      embedding: toVectorLiteral(embedding),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (updateError) {
    throw updateError;
  }

  return { updated: true as const };
}

export async function generateInternshipEmbeddingByPositionId(positionId: string) {
  const supabase = createAdminClient();

  const { data: internship, error: internshipError } = await supabase
    .from("internship_positions")
    .select("id, company_id, title, description, requirements")
    .eq("id", positionId)
    .maybeSingle();

  if (internshipError) {
    throw internshipError;
  }
  if (!internship) {
    return { updated: false as const };
  }

  const row = internship as InternshipRow;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("id", row.company_id)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  const text = buildInternshipEmbeddingText({
    internship: row,
    company: company as CompanyRow | undefined,
  });
  const embedding = await generateEmbedding(text);

  const { error: updateError } = await supabase
    .from("internship_positions")
    .update({
      embedding: toVectorLiteral(embedding),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", positionId);

  if (updateError) {
    throw updateError;
  }

  return { updated: true as const };
}
