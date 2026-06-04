"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Button, Select } from "@/components/ui";
import {
  SupervisorProfileHero,
  computeSupervisorProfileCompleteness,
} from "@/components/profile/SupervisorProfileUi";
import { ProfileField, ProfileSectionCard } from "@/components/profile/StudentProfileUi";
import { academicDepartmentSelectOptions, isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

export default function SupervisorProfilePage() {
  const { t } = useI18n();
  const supervisorDepartmentOptions = useMemo(
    () => [{ value: "", label: t("supervisor.profile.selectDepartment") }, ...academicDepartmentSelectOptions],
    [t],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentCount, setStudentCount] = useState<number | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [university, setUniversity] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [memberSince, setMemberSince] = useState("—");

  const [savedFullName, setSavedFullName] = useState("");
  const [savedDepartment, setSavedDepartment] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [savedUniversity, setSavedUniversity] = useState("");
  const [savedOfficeLocation, setSavedOfficeLocation] = useState("");

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

      const name = profileRow.full_name?.trim() ?? "";
      setFullName(name);
      setSavedFullName(name);
      setEmail(profileRow.email ?? "—");
      setRole(profileRow.role ?? "supervisor");

      const { data: supervisorRow, error: supervisorError } = await supabase
        .from("supervisors")
        .select("department, title, university, office_location, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor profile supervisors query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }

      const deptRaw = supervisorRow?.department ?? "";
      const deptForSelect =
        normalizeDepartmentAlias(deptRaw) ?? (isValidDepartment(deptRaw.trim()) ? deptRaw.trim() : "");
      const titleVal = supervisorRow?.title?.trim() ?? "";
      let universityVal = supervisorRow?.university?.trim() ?? "";
      const officeVal = supervisorRow?.office_location?.trim() ?? "";

      if (!universityVal) {
        const { data: upgradeReq } = await supabase
          .from("role_upgrade_requests")
          .select("payload")
          .eq("user_id", user.id)
          .eq("requested_role", "supervisor")
          .in("status", ["approved", "pending"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const payload =
          upgradeReq?.payload && typeof upgradeReq.payload === "object"
            ? (upgradeReq.payload as { university?: string })
            : null;
        if (payload?.university?.trim()) {
          universityVal = payload.university.trim();
        }
      }

      setDepartment(deptForSelect);
      setTitle(titleVal);
      setUniversity(universityVal);
      setOfficeLocation(officeVal);
      setSavedDepartment(deptForSelect);
      setSavedTitle(titleVal);
      setSavedUniversity(universityVal);
      setSavedOfficeLocation(officeVal);
      setMemberSince(
        supervisorRow?.created_at
          ? new Date(supervisorRow.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      );

      if (deptForSelect) {
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("department", deptForSelect);
        setStudentCount(typeof count === "number" ? count : 0);
      } else {
        setStudentCount(null);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const profileCompleteness = useMemo(
    () =>
      computeSupervisorProfileCompleteness({
        fullName,
        department,
        title,
        university,
        officeLocation,
      }),
    [fullName, department, title, university, officeLocation],
  );

  const resetEditFields = () => {
    setFullName(savedFullName);
    setDepartment(savedDepartment);
    setTitle(savedTitle);
    setUniversity(savedUniversity);
    setOfficeLocation(savedOfficeLocation);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      if (userError) console.error("supervisor profile save getUser error:", userError);
      setError("Unable to verify your account.");
      setSaving(false);
      return;
    }

    const nameTrim = fullName.trim();
    if (!nameTrim) {
      setError("Full name is required.");
      setSaving(false);
      return;
    }

    const deptTrim = department.trim();
    if (!isValidDepartment(deptTrim)) {
      setError("Please choose a valid department from the list.");
      setSaving(false);
      return;
    }

    const { error: profileSaveError } = await supabase
      .from("profiles")
      .update({ full_name: nameTrim })
      .eq("id", user.id);

    if (profileSaveError) {
      console.error("supervisor profile name save error:", profileSaveError);
      setError("Failed to save your name.");
      setSaving(false);
      return;
    }

    const { error: supervisorSaveError } = await supabase.from("supervisors").upsert(
      {
        user_id: user.id,
        department: deptTrim,
        title: title.trim() || null,
        university: university.trim() || null,
        office_location: officeLocation.trim() || null,
      },
      { onConflict: "user_id" },
    );

    if (supervisorSaveError) {
      console.error("supervisor profile save error:", supervisorSaveError);
      setError("Failed to save supervisor profile.");
      setSaving(false);
      return;
    }

    setSavedFullName(nameTrim);
    setSavedDepartment(deptTrim);
    setSavedTitle(title.trim());
    setSavedUniversity(university.trim());
    setSavedOfficeLocation(officeLocation.trim());
    setFullName(nameTrim);
    setDepartment(deptTrim);
    setUniversity(university.trim());
    setOfficeLocation(officeLocation.trim());

    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("department", deptTrim);
    setStudentCount(typeof count === "number" ? count : 0);

    setEditMode(false);
    setSaving(false);
    setSaved(true);
  };

  const editAction = editMode ? (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      onClick={() => {
        resetEditFields();
        setEditMode(false);
        setError(null);
      }}
      disabled={saving}
    >
      {t("supervisor.profile.cancelEdit")}
    </button>
  ) : (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-md transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => setEditMode(true)}
      disabled={loading}
    >
      {t("supervisor.profile.updateProfile")}
    </button>
  );

  const displayTitle = savedTitle.trim() || "—";
  const displayUniversity = savedUniversity.trim() || "—";
  const displayOffice = savedOfficeLocation.trim() || "—";
  const heroSubtitle = [title.trim() || t("supervisor.profile.academicSupervisor"), university.trim()].filter(Boolean).join(" · ");

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
            {t("supervisor.profile.profileUpdated")}
          </div>
        )}

        {loading ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <SupervisorProfileHero
              name={fullName}
              subtitle={heroSubtitle}
              badge={department || undefined}
              completeness={profileCompleteness}
              stats={[
                { label: t("supervisor.profile.students"), value: studentCount != null ? String(studentCount) : "—" },
                { label: t("supervisor.profile.university"), value: university.trim() || "—" },
                { label: t("supervisor.profile.office"), value: officeLocation.trim() || "—" },
              ]}
              action={editAction}
            />

            {!editMode && (
              <div
                className="mt-6 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-4 py-4 text-sm text-violet-900 dark:border-violet-500/20 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/20 dark:text-violet-100"
                role="note"
              >
                <p className="font-semibold">{t("supervisor.profile.keepProfileUpdated")}</p>
                <p className="mt-1 text-violet-800/90 dark:text-violet-200/90">
                  {t("supervisor.profile.keepProfileUpdatedDesc")}
                </p>
              </div>
            )}

            {editMode ? (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                {t("supervisor.profile.editModeHint")}
              </p>
            ) : (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{t("supervisor.profile.viewModeHint")}</p>
            )}

            {!editMode ? (
              <div className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("supervisor.profile.account")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label={t("supervisor.profile.fullName")} value={savedFullName} />
                    <ProfileField label={t("supervisor.profile.email")} value={email} />
                    <ProfileField label={t("supervisor.profile.role")} value={role} />
                    <ProfileField label={t("supervisor.profile.memberSince")} value={memberSince} />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("supervisor.profile.supervisorDetails")}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.948 22.948 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label={t("supervisor.profile.department")} value={savedDepartment} />
                    <ProfileField label={t("supervisor.profile.title")} value={displayTitle} />
                    <ProfileField label={t("supervisor.profile.university")} value={displayUniversity} />
                    <ProfileField label={t("supervisor.profile.officeLocation")} value={displayOffice} />
                  </div>
                </ProfileSectionCard>
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("supervisor.profile.account")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t("supervisor.profile.fullName")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    <Input label={t("supervisor.profile.email")} value={email} disabled readOnly />
                    <Input label={t("supervisor.profile.role")} value={role} disabled readOnly className="sm:col-span-2" />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("supervisor.profile.supervisorDetails")}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.948 22.948 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label={t("supervisor.profile.department")}
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      options={supervisorDepartmentOptions}
                    />
                    <Input label={t("supervisor.profile.title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input
                      label={t("supervisor.profile.university")}
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                    />
                    <Input
                      label={t("supervisor.profile.officeLocation")}
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                    />
                  </div>
                </ProfileSectionCard>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="w-full rounded-full py-3 sm:w-auto sm:px-8"
                >
                  {saving ? t("supervisor.profile.saving") : t("supervisor.profile.saveChanges")}
                </Button>
              </form>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
