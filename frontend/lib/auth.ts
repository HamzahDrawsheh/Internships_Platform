import { createClient } from "@/lib/supabase/server";

import type { ProfileRole } from "@/lib/types";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole | null;
}

/**
 * Ensure a row exists in profiles for the current user.
 * Uses user_metadata (role, full_name) from signup if profile is new.
 * Returns the profile; role may be null if not set (redirect to onboarding).
 */
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const role = (existing?.role ?? user.user_metadata?.role ?? null) as ProfileRole | null;
  const full_name = existing?.full_name ?? user.user_metadata?.full_name ?? null;
  const email = user.email ?? null;

  if (existing) {
    // Update if we have new metadata and profile was missing them
    if (!existing.full_name && full_name) {
      await supabase
        .from("profiles")
        .update({ full_name, email, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    if (!existing.role && role) {
      await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    return {
      id: existing.id,
      email: existing.email ?? email,
      full_name: existing.full_name ?? full_name,
      role: existing.role ?? role,
    };
  }

  // Insert new profile
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    full_name,
    role,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("ensureProfile insert error:", error);
    return {
      id: user.id,
      email,
      full_name,
      role,
    };
  }

  return { id: user.id, email, full_name, role };
}

/**
 * Get profile for current user (no upsert).
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return data as Profile;
}

export function getDashboardPath(role: ProfileRole | null): string {
  switch (role) {
    case "student":
      return "/dashboard/student";
    case "company":
      return "/dashboard/company";
    case "supervisor":
      return "/dashboard/supervisor";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/onboarding";
  }
}

/**
 * Get current user's role from profiles (server-side). Use in Server Components or Route Handlers.
 */
export async function getCurrentUserRole(): Promise<ProfileRole | null> {
  const profile = await getProfile();
  return profile?.role ?? null;
}
