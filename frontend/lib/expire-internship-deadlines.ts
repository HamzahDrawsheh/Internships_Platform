import { createClient } from "@/lib/supabase/client";

/** Deactivates listings whose application_deadline is before today. */
export async function invokeExpireInternshipApplicationDeadlines(
  supabase?: ReturnType<typeof createClient>
): Promise<number> {
  const client = supabase ?? createClient();
  const { data, error } = await client.rpc("expire_internship_application_deadlines");
  if (error) {
    console.error("[expire_internship_application_deadlines]", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
