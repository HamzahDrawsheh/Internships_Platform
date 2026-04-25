"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { academicDepartmentSelectOptions, isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";

const supervisorDepartmentOptions = [{ value: "", label: "Select your department" }, ...academicDepartmentSelectOptions];

type SupervisorProfile = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  title: string;
  created_at: string;
};

export default function SupervisorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departmentInput, setDepartmentInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [profile, setProfile] = useState<SupervisorProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("supervisor profile getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Please login to access your profile.");
        setLoading(false);
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("supervisor profile profiles query error:", profileError);
        setError("Unable to load profile details.");
        setLoading(false);
        return;
      }

      if (!profileRow || profileRow.role !== "supervisor") {
        setError("Access denied.");
        setLoading(false);
        return;
      }

      const { data: supervisorRow, error: supervisorError } = await supabase
        .from("supervisors")
        .select("department, title, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor profile supervisors query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }

      if (!supervisorRow) {
        const mapped = {
          user_id: user.id,
          full_name: profileRow.full_name?.trim() || "—",
          email: profileRow.email ?? "—",
          role: profileRow.role ?? "—",
          department: "—",
          title: "—",
          created_at: "—",
        };
        setProfile(mapped);
        setDepartmentInput("");
        setTitleInput("");
        setLoading(false);
        return;
      }

      const mapped = {
        user_id: user.id,
        full_name: profileRow.full_name?.trim() || "—",
        email: profileRow.email ?? "—",
        role: profileRow.role ?? "—",
        department: supervisorRow.department ?? "—",
        title: supervisorRow.title ?? "—",
        created_at: supervisorRow.created_at
          ? new Date(supervisorRow.created_at).toLocaleDateString()
          : "—",
      };
      setProfile(mapped);
      const deptRaw = supervisorRow.department ?? "";
      const deptForSelect =
        normalizeDepartmentAlias(deptRaw) ?? (isValidDepartment(deptRaw.trim()) ? deptRaw.trim() : "");
      setDepartmentInput(deptForSelect);
      setTitleInput(supervisorRow.title ?? "");
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      if (userError) {
        console.error("supervisor profile save getUser error:", userError);
      }
      setError("Unable to verify your account.");
      setSaving(false);
      return;
    }

    const deptTrim = departmentInput.trim();
    if (!isValidDepartment(deptTrim)) {
      setError("Please choose a valid department from the list.");
      setSaving(false);
      return;
    }

    const updatePayload = {
      user_id: user.id,
      department: deptTrim,
      title: titleInput.trim() || null,
    };

    const { error: saveError } = await supabase
      .from("supervisors")
      .upsert(updatePayload, { onConflict: "user_id" });

    if (saveError) {
      console.error("supervisor profile save error:", saveError);
      setError("Failed to save supervisor profile.");
      setSaving(false);
      return;
    }

      setProfile((prev) =>
      prev
        ? {
            ...prev,
            department: deptTrim,
            title: titleInput.trim() || "—",
          }
        : prev
    );
    setEditing(false);
    setSaving(false);
    setSuccess("Profile updated successfully.");
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-3xl">
        <PageHeader
          title="Supervisor Profile"
          description="Your account and supervisor profile details."
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading profile...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : !profile ? (
          <EmptyState
            title="No profile data"
            description="Unable to load supervisor profile details."
          />
        ) : (
          <Card>
            {success && (
              <p className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 transition-colors duration-300 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">{success}</p>
            )}
            <div className="mb-4 flex justify-end">
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
            <div className="grid gap-3 text-sm text-gray-700 transition-colors duration-300 dark:text-slate-300 sm:grid-cols-2">
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Full name:</span> {profile.full_name}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Email:</span> {profile.email}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Role:</span> {profile.role}</p>
              {editing ? (
                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Department"
                    required
                    value={departmentInput}
                    onChange={(e) => setDepartmentInput(e.target.value)}
                    options={supervisorDepartmentOptions}
                  />
                  <Input
                    label="Title"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Enter title"
                  />
                </div>
              ) : (
                <>
                  <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Department:</span> {profile.department}</p>
                  <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Title:</span> {profile.title}</p>
                </>
              )}
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Created:</span> {profile.created_at}</p>
            </div>
          </Card>
        )}
      </Container>
    </main>
  );
}
