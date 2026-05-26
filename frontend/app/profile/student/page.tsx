"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Textarea, Button, Select } from "@/components/ui";
import {
  ColoredChips,
  ProfileField,
  ProfileHero,
  ProfileSectionCard,
  computeProfileCompleteness,
} from "@/components/profile/StudentProfileUi";
import { isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { notifyStudentProfileUpdated } from "@/lib/dashboard/student-dashboard-sync";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import {
  ALL_PREDEFINED_COURSES,
  buildAvailabilityOptions,
  buildPreferredWorkTypeOptions,
  buildStudentCourseCategories,
  buildStudentDepartmentOptions,
  optionLabel,
} from "@/lib/i18n/student-profile-options";
import { buildGenderOptions, genderLabel, normalizeProfileGender, type ProfileGender } from "@/lib/profile/gender";

const CV_BUCKET = "student-cvs";
const MAX_CV_BYTES = 5 * 1024 * 1024;

function parseCsv(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function StudentProfilePage() {
  const { t } = useI18n();
  const studentDepartmentOptions = useMemo(() => buildStudentDepartmentOptions(t), [t]);
  const preferredWorkTypeOptions = useMemo(() => buildPreferredWorkTypeOptions(t), [t]);
  const availabilityOptions = useMemo(() => buildAvailabilityOptions(t), [t]);
  const courseCategories = useMemo(() => buildStudentCourseCategories(t), [t]);
  const genderOptions = useMemo(() => buildGenderOptions(t), [t]);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<ProfileGender>("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [takenCourses, setTakenCourses] = useState<string[]>([]);
  const [customCourses, setCustomCourses] = useState("");
  const [gpa, setGpa] = useState("");
  const [technicalSkills, setTechnicalSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");
  const [preferredField, setPreferredField] = useState("");
  const [preferredWorkType, setPreferredWorkType] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [availability, setAvailability] = useState("");
  const [studentRowId, setStudentRowId] = useState<string | null>(null);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvMessage, setCvMessage] = useState<string | null>(null);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadStudentProfile = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("student profile getUser error:", JSON.stringify(userError, null, 2));
        setError(t("profile.student.errors.loadProfile"));
        setLoading(false);
        return;
      }

      if (!user) {
        setError(t("profile.student.errors.loginRequired"));
        setLoading(false);
        return;
      }

      console.log("student profile load user.id:", user.id);

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, gender")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("student profile fetch profiles error:", JSON.stringify(profileError, null, 2));
      } else {
        setName(profileRow?.full_name ?? "");
        setGender(normalizeProfileGender(profileRow?.gender));
        if (profileRow?.role && profileRow.role !== "student") {
          setError(t("profile.student.errors.studentsOnly"));
          setLoading(false);
          return;
        }
      }

      const { data: studentRow, error: studentError } = await supabase
        .from("students")
        .select("id, university, department, major, skills, preferences, cv_path")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError) {
        console.error("student profile fetch students error:", JSON.stringify(studentError, null, 2));
        setError(t("profile.student.errors.loadStudent"));
        setLoading(false);
        return;
      }

      if (studentRow) {
        setStudentRowId(studentRow.id);
        setCvPath(typeof studentRow.cv_path === "string" && studentRow.cv_path.trim() ? studentRow.cv_path.trim() : null);
        setUniversity(studentRow.university ?? "");
        const dept = studentRow.department as string | null | undefined;
        const mapped = dept ? normalizeDepartmentAlias(dept) ?? (isValidDepartment(dept) ? dept : null) : null;
        setDepartment(mapped ?? "");
        setMajor(studentRow.major ?? "");
        setSkills(studentRow.skills ?? "");

        if (studentRow.preferences) {
          try {
            const parsed = JSON.parse(studentRow.preferences) as { year?: string; bio?: string };
            setYear(parsed?.year ?? "");
            setBio(parsed?.bio ?? "");
          } catch {
            // Backward compatibility: if preferences is plain text, keep it in bio.
            setBio(studentRow.preferences);
          }
        }
      }

      const { data: preferencesRow, error: preferencesError } = await supabase
        .from("student_additional_info")
        .select(
          "taken_courses, gpa, technical_skills, soft_skills, preferred_field, preferred_work_type, preferred_location, availability"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (preferencesError) {
        console.error(
          "student profile fetch student_additional_info error:",
          JSON.stringify(preferencesError, null, 2)
        );
      }
      console.log("student profile fetched student_additional_info:", preferencesRow ?? null);

      if (preferencesRow) {
        const allTakenCourses = (preferencesRow.taken_courses ?? []) as string[];
        const selectedPredefined = allTakenCourses.filter((course: string) => ALL_PREDEFINED_COURSES.includes(course));
        const inferredCustom = allTakenCourses.filter((course: string) => !ALL_PREDEFINED_COURSES.includes(course));
        setTakenCourses(selectedPredefined);
        setCustomCourses(inferredCustom.join(", "));
        setGpa(preferencesRow.gpa != null ? String(preferencesRow.gpa) : "");
        setTechnicalSkills((preferencesRow.technical_skills ?? []).join(", "));
        setSoftSkills((preferencesRow.soft_skills ?? []).join(", "));
        setPreferredField(preferencesRow.preferred_field ?? "");
        setPreferredWorkType(preferencesRow.preferred_work_type ?? "");
        setPreferredLocation(preferencesRow.preferred_location ?? "");
        setAvailability(preferencesRow.availability ?? "");
      }

      setLoading(false);
    };

    loadStudentProfile();
  }, [t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("student profile save getUser error:", JSON.stringify(userError, null, 2));
      setError(t("profile.student.errors.verifySession"));
      setSaving(false);
      return;
    }

    if (!user) {
      setError(t("profile.student.errors.loginSave"));
      setSaving(false);
      return;
    }

    console.log("student profile save user.id:", user.id);

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("student profile save role check error:", JSON.stringify(profileError, null, 2));
      setError(t("profile.student.errors.validateRole"));
      setSaving(false);
      return;
    }

    if (profileRow?.role !== "student") {
      setError(t("profile.student.errors.studentsOnly"));
      setSaving(false);
      return;
    }

    if (!isValidDepartment(department.trim())) {
      setError(t("profile.student.errors.chooseDepartment"));
      setSaving(false);
      return;
    }

    const preferencesPayload =
      year.trim() || bio.trim()
        ? JSON.stringify({
            year: year.trim() || null,
            bio: bio.trim() || null,
          })
        : null;

    const studentPayload = {
      university: university.trim() || null,
      department: department.trim(),
      major: major.trim() || null,
      skills: skills.trim() || null,
      preferences: preferencesPayload,
    };

    const parsedGpa = Number.parseFloat(gpa);
    const validGpa = !gpa.trim() || (Number.isFinite(parsedGpa) && parsedGpa >= 0 && parsedGpa <= 4);
    if (!validGpa) {
      setError(t("profile.student.errors.invalidGpa"));
      setSaving(false);
      return;
    }

    const { data: existingStudent, error: existingError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("student profile check existing error:", JSON.stringify(existingError, null, 2));
      setError(t("profile.student.errors.saveFailed"));
      setSaving(false);
      return;
    }

    if (existingStudent) {
      const { error: updateError } = await supabase
        .from("students")
        .update(studentPayload)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("student profile update error:", JSON.stringify(updateError, null, 2));
        setError(updateError.message);
        setSaving(false);
        return;
      }
      setStudentRowId(existingStudent.id);
    } else {
      const { data: insertedStudent, error: insertError } = await supabase
        .from("students")
        .insert({
          user_id: user.id,
          ...studentPayload,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("student profile insert error:", JSON.stringify(insertError, null, 2));
        setError(insertError.message);
        setSaving(false);
        return;
      }
      if (insertedStudent?.id) {
        setStudentRowId(insertedStudent.id);
      }
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        gender: gender || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("student profile update profiles error:", JSON.stringify(profileUpdateError, null, 2));
      setError(profileUpdateError.message);
      setSaving(false);
      return;
    }

    const mergedTakenCourses = Array.from(new Set([...takenCourses, ...parseCsv(customCourses)]));
    const additionalInfoPayload = {
      user_id: user.id,
      taken_courses: mergedTakenCourses,
      gpa: gpa.trim() ? parsedGpa : null,
      technical_skills: parseCsv(technicalSkills),
      soft_skills: parseCsv(softSkills),
      preferred_field: preferredField.trim() || null,
      preferred_work_type: preferredWorkType || null,
      preferred_location: preferredLocation.trim() || null,
      availability: availability || null,
    };
    console.log("student profile upsert payload:", additionalInfoPayload);

    const { error: additionalInfoError } = await supabase
      .from("student_additional_info")
      .upsert(additionalInfoPayload, { onConflict: "user_id" });

    if (additionalInfoError) {
      console.error(
        "student profile save student_additional_info error:",
        JSON.stringify(additionalInfoError, null, 2)
      );
    }

    void fetch("/api/embeddings/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ scope: "student" }),
    })
      .then(() => {
        notifyStudentProfileUpdated();
      })
      .catch(() => {});

    setSaved(true);
    setEditMode(false);
    setSaving(false);
    notifyStudentProfileUpdated();
  };

  const handleCvUpload = async () => {
    setCvMessage(null);
    setCvUploadError(null);

    if (!studentRowId) {
      setCvUploadError(t("profile.student.saveDeptBeforeCv"));
      return;
    }

    if (!cvFile) {
      setCvUploadError(t("profile.student.choosePdfFirst"));
      return;
    }

    const lower = cvFile.name.toLowerCase();
    if (!lower.endsWith(".pdf")) {
      setCvUploadError(t("profile.student.pdfOnly"));
      return;
    }

    if (cvFile.type && cvFile.type !== "application/pdf") {
      setCvUploadError(t("profile.student.pdfOnly"));
      return;
    }

    if (cvFile.size > MAX_CV_BYTES) {
      setCvUploadError(t("profile.student.pdfSize"));
      return;
    }

    setCvUploading(true);
    const supabase = createClient();

    const objectPath = `students/${studentRowId}/cv.pdf`;

    const { error: uploadError } = await supabase.storage.from(CV_BUCKET).upload(objectPath, cvFile, {
      upsert: true,
      contentType: "application/pdf",
    });

    if (uploadError) {
      console.error("student CV upload error:", uploadError);
      setCvUploadError(uploadError.message || t("profile.student.errors.uploadFailed"));
      setCvUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("students")
      .update({ cv_path: objectPath, cv_url: null })
      .eq("id", studentRowId);

    if (updateError) {
      console.error("student CV path update error:", updateError);
      setCvUploadError(updateError.message || t("profile.student.errors.uploadProfileFailed"));
      setCvUploading(false);
      return;
    }

    setCvPath(objectPath);
    setCvFile(null);
    setCvMessage(t("profile.student.cvUploadSuccess"));
    setCvUploading(false);
  };

  const allCourses = useMemo(
    () => [...takenCourses, ...parseCsv(customCourses)].filter(Boolean),
    [takenCourses, customCourses]
  );

  const technicalSkillList = useMemo(() => parseCsv(technicalSkills), [technicalSkills]);
  const softSkillList = useMemo(() => parseCsv(softSkills), [softSkills]);
  const legacySkillList = useMemo(() => parseCsv(skills), [skills]);

  const profileCompleteness = useMemo(
    () =>
      computeProfileCompleteness({
        name,
        gender,
        university,
        department,
        major,
        year,
        skills,
        bio,
        gpa,
        technicalSkills,
        softSkills,
        preferredField,
        preferredWorkType,
        preferredLocation,
        availability,
        hasCourses: allCourses.length > 0,
        hasCv: Boolean(cvPath),
      }),
    [
      name,
      gender,
      university,
      department,
      major,
      year,
      skills,
      bio,
      gpa,
      technicalSkills,
      softSkills,
      preferredField,
      preferredWorkType,
      preferredLocation,
      availability,
      allCourses.length,
      cvPath,
    ]
  );

  const heroSubtitle = [university.trim(), major.trim()].filter(Boolean).join(" · ");
  const editAction = editMode ? (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      onClick={() => {
        setEditMode(false);
        setSaved(false);
        setError(null);
      }}
    >
      {t("common.cancel")}
    </button>
  ) : (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-md transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => setEditMode(true)}
      disabled={loading}
    >
      {t("common.updateProfile")}
    </button>
  );

  return (
    <main className="py-8 pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-3xl">
        {error && (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            role="status"
          >
            {t("profile.student.changesSaved")}
          </div>
        )}
        {loading ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <ProfileHero
              name={name}
              gender={gender}
              subtitle={heroSubtitle || undefined}
              badge={department.trim() || undefined}
              completeness={profileCompleteness}
              stats={[
                { label: t("profile.student.gpa"), value: gpa.trim() || "—" },
                {
                  label: t("profile.student.courses"),
                  value: allCourses.length > 0 ? String(allCourses.length) : "—",
                },
                {
                  label: t("profile.student.cv"),
                  value: cvPath ? "✓" : "—",
                },
              ]}
              action={editAction}
            />

            {!editMode && (
              <div
                className="mt-6 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-4 py-4 text-sm text-violet-900 dark:border-violet-500/20 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/20 dark:text-violet-100"
                role="note"
              >
                <p className="font-semibold">{t("profile.student.tipTitle")}</p>
                <p className="mt-1 text-violet-800/90 dark:text-violet-200/90">{t("profile.student.tipBody")}</p>
              </div>
            )}

            {editMode ? (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{t("profile.student.descEdit")}</p>
            ) : (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{t("profile.student.descView")}</p>
            )}

            {!editMode ? (
              <div className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("profile.student.personalInfo")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label={t("profile.student.fullName")} value={name} />
                    <ProfileField label={t("profile.student.gender")} value={genderLabel(gender, t)} />
                    <ProfileField label={t("profile.student.university")} value={university} />
                    <ProfileField label={t("profile.student.department")} value={department} />
                    <ProfileField label={t("profile.student.major")} value={major} />
                    <ProfileField label={t("profile.student.year")} value={year} />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.skillsBio")}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M11.3 1.046a1 1 0 011.414 0l1.544 1.544a1 1 0 01.293.707V5.5a1 1 0 001 1h2.203a1 1 0 01.707.293l1.544 1.544a1 1 0 010 1.414l-1.544 1.544a1 1 0 01-.707.293H15.5a1 1 0 00-1 1v2.203a1 1 0 01-.293.707l-1.544 1.544a1 1 0 01-1.414 0l-1.544-1.544a1 1 0 01-.293-.707V15.5a1 1 0 00-1-1h-2.203a1 1 0 01-.707-.293l-1.544-1.544a1 1 0 010-1.414l1.544-1.544a1 1 0 01.707-.293H5.5a1 1 0 001-1V8.544a1 1 0 01.293-.707l1.544-1.544zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("profile.student.skills")}
                      </p>
                      <div className="mt-2">
                        <ColoredChips items={legacySkillList.length > 0 ? legacySkillList : technicalSkillList} />
                      </div>
                    </div>
                    <ProfileField label={t("profile.student.bio")} value={bio} />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.additionalInfo")}
                  accent="emerald"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label={t("profile.student.gpa")} value={gpa} />
                    <ProfileField label={t("profile.student.preferredField")} value={preferredField} />
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("profile.student.technicalSkills")}
                      </p>
                      <div className="mt-2">
                        <ColoredChips items={technicalSkillList} />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("profile.student.softSkills")}
                      </p>
                      <div className="mt-2">
                        <ColoredChips items={softSkillList} />
                      </div>
                    </div>
                    <ProfileField
                      label={t("profile.student.preferredWorkType")}
                      value={optionLabel(preferredWorkType, preferredWorkTypeOptions)}
                    />
                    <ProfileField label={t("profile.student.preferredLocation")} value={preferredLocation} />
                    <ProfileField
                      label={t("profile.student.availability")}
                      value={optionLabel(availability, availabilityOptions)}
                    />
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("profile.student.courses")}
                      </p>
                      <div className="mt-2">
                        <ColoredChips items={allCourses} />
                      </div>
                    </div>
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.cv")}
                  accent="amber"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div
                    className={`rounded-xl border-2 border-dashed px-4 py-6 text-center ${
                      cvPath
                        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                        : "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {cvPath ? t("profile.student.cvUploaded") : t("profile.student.cvNotUploaded")}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("profile.student.cvReplaceHint")}</p>
                  </div>
                </ProfileSectionCard>
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("profile.student.personalInfo")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t("profile.student.fullName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.student.phName")} />
                    <Select
                      label={t("profile.student.gender")}
                      value={gender}
                      onChange={(e) => setGender(normalizeProfileGender(e.target.value))}
                      options={genderOptions}
                    />
                    <Input label={t("profile.student.university")} value={university} onChange={(e) => setUniversity(e.target.value)} placeholder={t("profile.student.phUniversity")} />
                    <Select
                      label={t("profile.student.department")}
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      options={studentDepartmentOptions}
                    />
                    <Input label={t("profile.student.major")} value={major} onChange={(e) => setMajor(e.target.value)} placeholder={t("profile.student.phMajor")} />
                    <Input label={t("profile.student.year")} value={year} onChange={(e) => setYear(e.target.value)} placeholder={t("profile.student.phYear")} />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.skillsBio")}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M11.3 1.046a1 1 0 011.414 0l1.544 1.544a1 1 0 01.293.707V5.5a1 1 0 001 1h2.203a1 1 0 01.707.293l1.544 1.544a1 1 0 010 1.414l-1.544 1.544a1 1 0 01-.707.293H15.5a1 1 0 00-1 1v2.203a1 1 0 01-.293.707l-1.544 1.544a1 1 0 01-1.414 0l-1.544-1.544a1 1 0 01-.293-.707V15.5a1 1 0 00-1-1h-2.203a1 1 0 01-.707-.293l-1.544-1.544a1 1 0 010-1.414l1.544-1.544a1 1 0 01.707-.293H5.5a1 1 0 001-1V8.544a1 1 0 01.293-.707l1.544-1.544zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <Input
                    label={t("profile.student.skillsComma")}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder={t("profile.student.phSkills")}
                  />
                  <Textarea
                    label={t("profile.student.bio")}
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-4"
                    placeholder={t("profile.student.phBio")}
                  />
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.additionalInfo")}
                  accent="emerald"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("profile.student.courses")}</h3>
                    {courseCategories.map((category) => (
                      <div
                        key={category.title}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{category.title}</h4>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {category.courses.map((course) => {
                            const isChecked = takenCourses.includes(course);
                            return (
                              <label key={course} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    setTakenCourses((prev) =>
                                      e.target.checked ? [...prev, course] : prev.filter((item) => item !== course)
                                    );
                                  }}
                                />
                                <span>{course}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <Input
                      label={t("profile.student.otherCourses")}
                      value={customCourses}
                      onChange={(e) => setCustomCourses(e.target.value)}
                      placeholder={t("profile.student.phOtherCourses")}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t("profile.student.gpaOptional")}
                      type="number"
                      min={0}
                      max={4}
                      step="0.01"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder={t("profile.student.phGpa")}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t("profile.student.technicalSkillsComma")}
                      value={technicalSkills}
                      onChange={(e) => setTechnicalSkills(e.target.value)}
                      placeholder={t("profile.student.phTechSkills")}
                    />
                    <Input
                      label={t("profile.student.softSkillsComma")}
                      value={softSkills}
                      onChange={(e) => setSoftSkills(e.target.value)}
                      placeholder={t("profile.student.phSoftSkills")}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t("profile.student.preferredField")}
                      value={preferredField}
                      onChange={(e) => setPreferredField(e.target.value)}
                      placeholder={t("profile.student.phField")}
                    />
                    <Input
                      label={t("profile.student.preferredLocation")}
                      value={preferredLocation}
                      onChange={(e) => setPreferredLocation(e.target.value)}
                      placeholder={t("profile.student.phLocation")}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Select
                      label={t("profile.student.preferredWorkType")}
                      options={preferredWorkTypeOptions}
                      value={preferredWorkType}
                      onChange={(e) => setPreferredWorkType(e.target.value)}
                    />
                    <Select
                      label={t("profile.student.availability")}
                      options={availabilityOptions}
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                    />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.student.cvUpload")}
                  accent="amber"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("profile.student.cvUploadDesc")}</p>
                  {cvMessage && (
                    <div
                      className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      role="status"
                    >
                      {cvMessage}
                    </div>
                  )}
                  {cvUploadError && (
                    <div
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      role="alert"
                    >
                      {cvUploadError}
                    </div>
                  )}
                  <div className="mt-4 rounded-xl border-2 border-dashed border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          disabled={cvUploading || !studentRowId}
                          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-800 hover:file:bg-violet-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-violet-500/20 dark:file:text-violet-200"
                          aria-label={t("profile.student.uploadCvAria")}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setCvFile(file);
                            setCvMessage(null);
                            setCvUploadError(null);
                          }}
                        />
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {cvPath ? t("profile.student.cvOnFile") : t("profile.student.cvNotUploaded")}
                          {!studentRowId && (
                            <span className="mt-1 block text-amber-700 dark:text-amber-300">
                              {t("profile.student.cvSaveDeptFirst")}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={cvUploading || !studentRowId || !cvFile}
                        onClick={() => void handleCvUpload()}
                        className="rounded-full"
                      >
                        {cvUploading ? t("profile.student.uploading") : t("profile.student.uploadCv")}
                      </Button>
                    </div>
                  </div>
                </ProfileSectionCard>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || saving}
                  className="w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 shadow-md shadow-violet-300/40 hover:from-violet-700 hover:to-fuchsia-700 sm:w-auto sm:px-8"
                >
                  {saving ? t("profile.student.saving") : t("profile.student.saveChanges")}
                </Button>
              </form>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
