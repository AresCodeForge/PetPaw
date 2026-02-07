import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/admin/shelters - List shelter applications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status"); // pending, approved, rejected
    const offset = (page - 1) * limit;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("shelter_applications")
      .select(`
        *,
        user:profiles!shelter_applications_user_id_profiles_fkey(id, name, email, avatar_url)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: applications, count, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/shelters", error), { status: 500 });
    }

    return NextResponse.json({
      applications: applications ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/shelters", e), { status: 500 });
  }
}
