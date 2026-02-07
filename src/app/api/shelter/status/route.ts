import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/shelter/status - Get user's shelter status and application
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Get profile with shelter info
    const { data: profile } = await admin
      .from("profiles")
      .select("is_shelter, shelter_name, shelter_verified_at")
      .eq("id", user.id)
      .single();

    // Get latest application
    const { data: application } = await admin
      .from("shelter_applications")
      .select("id, organization_name, status, admin_notes, created_at, reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      is_verified: profile?.is_shelter && !!profile?.shelter_verified_at,
      shelter_name: profile?.shelter_name,
      verified_at: profile?.shelter_verified_at,
      application: application || null,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/shelter/status", e), { status: 500 });
  }
}
