"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Textarea, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function StudentProfilePage() {
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        console.error("student profile getUser error:", userError);
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to edit your profile.");
        setLoading(false);
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("student profile fetch profiles error:", profileError);
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
        .select("university, major, skills, preferences")
        .eq("user_id", user.id)
        .single();

      if (studentError && studentError.code !== "PGRST116") {
        console.error("student profile fetch students error:", studentError);
        setError("Unable to load your student data.");
        setLoading(false);
        return;
      }

      if (studentRow) {
        setUniversity(studentRow.university ?? "");
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
      console.error("student profile save getUser error:", userError);
      setError("Unable to verify your session.");
      setSaving(false);
      return;
    }

    if (!user) {
      setError("You must be logged in to save your profile.");
      setSaving(false);
      return;
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("student profile save role check error:", profileError);
      setError("Unable to validate your account role.");
      setSaving(false);
      return;
    }

    if (profileRow?.role !== "student") {
      setError("Only student accounts can save this profile.");
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
      major: major.trim() || null,
      skills: skills.trim() || null,
      preferences: preferencesPayload,
    };

    const { data: existingStudent, error: existingError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("student profile check existing error:", existingError);
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
        console.error("student profile update error:", updateError);
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("students").insert({
        user_id: user.id,
        ...studentPayload,
      });

      if (insertError) {
        console.error("student profile insert error:", insertError);
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("student profile update profiles error:", profileUpdateError);
      setError(profileUpdateError.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
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
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">CV upload</h2>
            <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Upload a PDF (max 5MB). Upload logic will be connected later.</p>
            <div className="mt-4">
              <input
                type="file"
                accept=".pdf"
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition-colors duration-300 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-white dark:hover:file:bg-slate-600"
                aria-label="Upload CV (PDF)"
                onChange={() => {}}
              />
              <p className="mt-2 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No file selected. Upload will be implemented with storage integration.</p>
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
