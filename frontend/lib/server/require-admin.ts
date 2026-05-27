import { createClient } from "@/lib/supabase/server";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

export async function requireAdminUser(): Promise<AdminAuthResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, status: 500, error: "server_error" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: "unauthenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: "profile_error" };
  }

  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, userId: user.id };
}
