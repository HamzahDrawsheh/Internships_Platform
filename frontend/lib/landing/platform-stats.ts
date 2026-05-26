import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformStats = {
  students: number;
  companies: number;
  positions: number;
};

const empty: PlatformStats = { students: 0, companies: 0, positions: 0 };

function parseStats(data: unknown): PlatformStats | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    students: typeof row.students === "number" ? row.students : Number(row.students) || 0,
    companies: typeof row.companies === "number" ? row.companies : Number(row.companies) || 0,
    positions: typeof row.positions === "number" ? row.positions : Number(row.positions) || 0,
  };
}

async function countWithAdmin(): Promise<PlatformStats> {
  const supabase = createAdminClient();
  const [studentsRes, companiesRes, positionsRes] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("internship_positions").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    students: studentsRes.count ?? 0,
    companies: companiesRes.count ?? 0,
    positions: positionsRes.count ?? 0,
  };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_platform_stats");

    if (!error && data) {
      const parsed = parseStats(data);
      if (parsed) return parsed;
    }

    if (error) {
      console.error("get_public_platform_stats RPC error:", error.message);
    }
  } catch (err) {
    console.error("getPlatformStats RPC failed:", err);
  }

  try {
    return await countWithAdmin();
  } catch (err) {
    console.error("getPlatformStats admin fallback failed:", err);
    return empty;
  }
}
