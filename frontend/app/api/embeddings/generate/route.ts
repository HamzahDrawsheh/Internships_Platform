import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateInternshipEmbeddingsForAll,
  generateStudentEmbeddingsForAll,
} from "@/lib/ai/embeddings";

export async function POST() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ ok: false, error: "Server configuration error" }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "Unable to verify permissions" }, { status: 500 });
  }

  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const [students, internships] = await Promise.all([
      generateStudentEmbeddingsForAll(),
      generateInternshipEmbeddingsForAll(),
    ]);

    return NextResponse.json({
      ok: true,
      students,
      internships,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate embeddings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
