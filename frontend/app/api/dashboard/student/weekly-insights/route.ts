import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "student") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const since = weekAgo.toISOString();

    const [positionsRes, companiesRes] = await Promise.all([
      supabase
        .from("internship_positions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("created_at", since),
      supabase.from("companies").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    return NextResponse.json({
      ok: true,
      newInternshipsLastWeek: positionsRes.count ?? 0,
      newCompaniesLastWeek: companiesRes.count ?? 0,
    });
  } catch (error) {
    console.error("[api/dashboard/student/weekly-insights]", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
