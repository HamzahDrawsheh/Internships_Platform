import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadCompanyLogo } from "@/lib/companies/logo";

export async function POST(request: Request) {
  try {
    let supabaseAuth;
    try {
      supabaseAuth = await createClient();
    } catch {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Unable to verify permissions" }, { status: 500 });
    }

    if (profile?.role !== "company") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: company, error: companyError } = await supabaseAuth
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError) {
      return NextResponse.json({ error: "Unable to verify company" }, { status: 500 });
    }

    if (!company) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await uploadCompanyLogo(admin, company.id, file);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ logoUrl: result.publicUrl });
  } catch (error) {
    console.error("company logo upload route error:", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
