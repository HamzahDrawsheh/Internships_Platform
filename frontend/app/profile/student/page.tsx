"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Textarea, Button, Card, Select } from "@/components/ui";
import { isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import {
  ALL_PREDEFINED_COURSES,
  buildAvailabilityOptions,
  buildPreferredWorkTypeOptions,
  buildStudentCourseCategories,
  buildStudentDepartmentOptions,
  optionLabel,
} from "@/lib/i18n/student-profile-options";

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
  const [name, setName] = useState("");
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
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("student profile fetch profiles error:", JSON.stringify(profileError, null, 2));
      } else {
        setName(profileRow?.full_name ?? "");
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
      .update({ full_name: name.trim() || null, updated_at: new Date().toISOString() })
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
    }).catch(() => {});

    setSaved(true);
    setSaving(false);
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

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title={t("profile.student.title")}
          description={editMode ? t("profile.student.descEdit") : t("profile.student.descView")}
          action={
            editMode ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setSaved(false);
                  setError(null);
                }}
              >
                {t("common.cancel")}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => setEditMode(true)} disabled={loading}>
                {t("common.updateProfile")}
              </Button>
            )
          }
        />
        {!loading && (
          <div
            className="mb-6 rounded-xl border border-purple-200 bg-purple-50/80 px-4 py-3 text-sm text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-100"
            role="note"
          >
            <p className="font-medium">{t("profile.student.tipTitle")}</p>
            <p className="mt-1 text-purple-800/90 dark:text-purple-200/90">{t("profile.student.tipBody")}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">{error}</div>
        )}
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">{t("profile.student.changesSaved")}</div>
        )}
        {loading ? (
          <ProfileFormSkeleton />
        ) : !editMode ? (
          <div className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                {t("profile.student.personalInfo")}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.fullName")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{name.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.university")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{university.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.department")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{department.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.major")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{major.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.year")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{year.trim() || "—"}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                {t("profile.student.skillsBio")}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.skills")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{skills.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.bio")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900 dark:text-white">{bio.trim() || "—"}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                {t("profile.student.additionalInfo")}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.gpa")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{gpa.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.technicalSkills")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{technicalSkills.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.softSkills")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{softSkills.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.preferredField")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{preferredField.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.preferredWorkType")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {optionLabel(preferredWorkType, preferredWorkTypeOptions)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.preferredLocation")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{preferredLocation.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.availability")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {optionLabel(availability, availabilityOptions)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.student.courses")}</p>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {takenCourses.length || customCourses.trim()
                      ? [...takenCourses, ...parseCsv(customCourses)].filter(Boolean).join(", ")
                      : "—"}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                {t("profile.student.cv")}
              </h2>
              <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-300">
                {cvPath ? t("profile.student.cvUploaded") : t("profile.student.cvNotUploaded")}
              </p>
              <p className="mt-2 text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                {t("profile.student.cvReplaceHint")}
              </p>
            </Card>
          </div>
        ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">{t("profile.student.personalInfo")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label={t("profile.student.fullName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.student.phName")} />
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
          </Card>
          <Card>
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
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
              {t("profile.student.additionalInfo")}
            </h2>
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-800 dark:text-slate-200">{t("profile.student.courses")}</h3>
              {courseCategories.map((category) => (
                <div key={category.title} className="rounded-md border border-gray-200 p-3 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{category.title}</h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {category.courses.map((course) => {
                      const isChecked = takenCourses.includes(course);
                      return (
                        <label key={course} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800"
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
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">{t("profile.student.cvUpload")}</h2>
            <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
              {t("profile.student.cvUploadDesc")}
            </p>
            {cvMessage && (
              <div
                className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
                role="status"
              >
                {cvMessage}
              </div>
            )}
            {cvUploadError && (
              <div
                className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                role="alert"
              >
                {cvUploadError}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={cvUploading || !studentRowId}
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition-colors duration-300 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-white dark:hover:file:bg-slate-600"
                  aria-label={t("profile.student.uploadCvAria")}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCvFile(file);
                    setCvMessage(null);
                    setCvUploadError(null);
                  }}
                />
                <p className="mt-2 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
                  {cvPath ? t("profile.student.cvOnFile") : t("profile.student.cvNotUploaded")}
                  {!studentRowId && (
                    <span className="mt-1 block text-amber-700 dark:text-amber-300">
                      {t("profile.student.cvSaveDeptFirst")}
                    </span>
                  )}
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={cvUploading || !studentRowId || !cvFile} onClick={() => void handleCvUpload()}>
                {cvUploading ? t("profile.student.uploading") : t("profile.student.uploadCv")}
              </Button>
            </div>
          </Card>
          <Button type="submit" variant="primary" disabled={loading || saving}>
            {saving ? t("profile.student.saving") : t("profile.student.saveChanges")}
          </Button>
        </form>
        )}
      </Container>
    </main>
  );
}
