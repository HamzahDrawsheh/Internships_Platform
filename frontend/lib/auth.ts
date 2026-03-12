import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api";
import type { ProfileRole } from "@/lib/types";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole | null;
}

/**
 * Ensure a row exists in profiles for the current user (via backend).
 * Returns the profile; role may be null if not set (redirect to onboarding).
 */
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  try {
    const { id, profile } = await api.get<{ id: string; profile?: Profile }>("/auth/me", { token });
    if (profile) {
      return {
        id: profile.id,
        email: profile.email ?? null,
        full_name: profile.full_name ?? null,
        role: profile.role ?? null,
      };
    }
    return { id, email: null, full_name: null, role: null };
  } catch {
    return null;
  }
}

/**
 * Get profile for current user (no upsert). Uses backend GET /profiles/me.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  try {
    const profile = await api.get<Profile>("/profiles/me", { token });
    return {
      id: profile.id,
      email: profile.email ?? null,
      full_name: profile.full_name ?? null,
      role: profile.role ?? null,
    };
  } catch {
    return null;
  }
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
