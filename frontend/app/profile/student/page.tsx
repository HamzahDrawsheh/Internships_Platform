"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Textarea, Button, Card, Select } from "@/components/ui";
import { academicDepartmentSelectOptions, isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";

const studentDepartmentOptions = [{ value: "", label: "Select your department" }, ...academicDepartmentSelectOptions];

function parseCsv(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const preferredWorkTypeOptions = [
  { value: "", label: "No preference" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

const availabilityOptions = [
  { value: "", label: "Not specified" },
  { value: "part-time", label: "Part-time" },
  { value: "full-time", label: "Full-time" },
];

const CV_BUCKET = "student-cvs";
const MAX_CV_BYTES = 5 * 1024 * 1024;

const courseCategories = [
  {
    title: "Core Courses",
    courses: [
      "Introduction to Data Science",
      "Introduction to Artificial Intelligence",
      "Programming",
      "Object-Oriented Programming (OOP)",
      "Data Structures",
      "Algorithms",
      "Database Systems",
      "Discrete Mathematics",
    ],
  },
  {
    title: "Mathematics & Statistics",
    courses: [
      "Calculus 1",
      "Calculus 2",
      "Linear Algebra",
      "Probability & Statistics",
      "Statistical Inference",
      "Numerical Methods",
    ],
  },
  {
    title: "Artificial Intelligence",
    courses: [
      "Artificial Intelligence",
      "Machine Learning",
      "Deep Learning",
      "Natural Language Processing (NLP)",
      "Computer Vision",
      "Intelligent Systems",
    ],
  },
  {
    title: "Data Science",
    courses: [
      "Data Mining",
      "Big Data Analytics",
      "Data Visualization",
      "Data Warehousing",
      "Business Intelligence",
      "Predictive Analytics",
    ],
  },
  {
    title: "Technical Support",
    courses: [
      "Operating Systems",
      "Computer Networks",
      "Cloud Computing",
      "Distributed Systems",
      "Software Engineering",
    ],
  },
];

const PREDEFINED_COURSES = courseCategories.flatMap((category) => category.courses);

export default function StudentProfilePage() {
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
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to edit your profile.");
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
          setError("Only student accounts can save this profile.");
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
        setError("Unable to load your student data.");
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
        const selectedPredefined = allTakenCourses.filter((course: string) => PREDEFINED_COURSES.includes(course));
        const inferredCustom = allTakenCourses.filter((course: string) => !PREDEFINED_COURSES.includes(course));
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
  }, []);

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
      setError("Unable to verify your session.");
      setSaving(false);
      return;
    }

    if (!user) {
      setError("You must be logged in to save your profile.");
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
      setError("Unable to validate your account role.");
      setSaving(false);
      return;
    }

    if (profileRow?.role !== "student") {
      setError("Only student accounts can save this profile.");
      setSaving(false);
      return;
    }

    if (!isValidDepartment(department.trim())) {
      setError("Please choose your academic department from the list.");
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
      setError("GPA must be a number between 0 and 4.");
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
      setError("Unable to save your student profile.");
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
      setCvUploadError("Save your profile once with a valid department before uploading a CV.");
      return;
    }

    if (!cvFile) {
      setCvUploadError("Choose a PDF file first.");
      return;
    }

    const lower = cvFile.name.toLowerCase();
    if (!lower.endsWith(".pdf")) {
      setCvUploadError("Only PDF files are allowed.");
      return;
    }

    if (cvFile.type && cvFile.type !== "application/pdf") {
      setCvUploadError("Only PDF files are allowed.");
      return;
    }

    if (cvFile.size > MAX_CV_BYTES) {
      setCvUploadError("PDF must be 5MB or smaller.");
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
      setCvUploadError(uploadError.message || "Upload failed.");
      setCvUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("students")
      .update({ cv_path: objectPath, cv_url: null })
      .eq("id", studentRowId);

    if (updateError) {
      console.error("student CV path update error:", updateError);
      setCvUploadError(updateError.message || "Saved file but could not update profile.");
      setCvUploading(false);
      return;
    }

    setCvPath(objectPath);
    setCvFile(null);
    setCvMessage("CV uploaded successfully.");
    setCvUploading(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader title="Student Profile" description="Manage your personal info, skills, and CV." />
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">{error}</div>
        )}
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">Changes saved.</div>
        )}
        {loading && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800 transition-colors duration-300 dark:border dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" role="status">Loading profile...</div>
        )}
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Personal info</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Input label="University" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University name" />
              <Select
                label="Department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={studentDepartmentOptions}
              />
              <Input label="Major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Computer Science" />
              <Input label="Year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 3rd, 4th" />
            </div>
          </Card>
          <Card>
            <Input
              label="Skills (comma-separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Python, ML, SQL"
            />
            <Textarea
              label="Bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-4"
              placeholder="Short bio for your profile"
            />
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
              Additional Information
            </h2>
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-800 dark:text-slate-200">Courses</h3>
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
                label="Other courses (comma-separated)"
                value={customCourses}
                onChange={(e) => setCustomCourses(e.target.value)}
                placeholder="Reinforcement Learning, Time Series Analysis"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="GPA (optional)"
                type="number"
                min={0}
                max={4}
                step="0.01"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="e.g. 3.50"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Technical skills (comma-separated)"
                value={technicalSkills}
                onChange={(e) => setTechnicalSkills(e.target.value)}
                placeholder="Python, TensorFlow, SQL"
              />
              <Input
                label="Soft skills (comma-separated)"
                value={softSkills}
                onChange={(e) => setSoftSkills(e.target.value)}
                placeholder="Communication, Teamwork"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Preferred field"
                value={preferredField}
                onChange={(e) => setPreferredField(e.target.value)}
                placeholder="AI, Data Science, Web"
              />
              <Input
                label="Preferred location"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="Amman"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select
                label="Preferred work type"
                options={preferredWorkTypeOptions}
                value={preferredWorkType}
                onChange={(e) => setPreferredWorkType(e.target.value)}
              />
              <Select
                label="Availability"
                options={availabilityOptions}
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">CV upload</h2>
            <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
              PDF only, max 5MB. Your CV is stored privately; companies only get a temporary link when they review your
              application.
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
                  aria-label="Upload CV (PDF)"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCvFile(file);
                    setCvMessage(null);
                    setCvUploadError(null);
                  }}
                />
                <p className="mt-2 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
                  {cvPath ? "A CV is on file (cv.pdf). You can replace it below." : "No CV uploaded yet."}
                  {!studentRowId && (
                    <span className="mt-1 block text-amber-700 dark:text-amber-300">
                      Save your profile with a valid department first, then upload your CV.
                    </span>
                  )}
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={cvUploading || !studentRowId || !cvFile} onClick={() => void handleCvUpload()}>
                {cvUploading ? "Uploading..." : "Upload CV"}
              </Button>
            </div>
          </Card>
          <Button type="submit" variant="primary" disabled={loading || saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Container>
    </main>
  );
}
