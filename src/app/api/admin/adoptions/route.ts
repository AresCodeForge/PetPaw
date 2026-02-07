import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/admin/adoptions - List all adoption listings for admin
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
    const status = searchParams.get("status"); // available, pending, adopted
    const approved = searchParams.get("approved"); // true, false, all
    const offset = (page - 1) * limit;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("adoption_listings")
      .select(`
        *,
        images:adoption_images(id, image_url, display_order)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["available", "pending", "adopted"].includes(status)) {
      query = query.eq("status", status);
    }

    if (approved === "true") {
      query = query.eq("is_approved", true);
    } else if (approved === "false") {
      query = query.eq("is_approved", false);
    }

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/adoptions", error), { status: 500 });
    }

    // Fetch user profiles for all listings
    const userIds = [...new Set((listings ?? []).map(l => l.user_id))];
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, email, is_shelter, shelter_name")
        .in("id", userIds);
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Attach user profiles to listings
    const listingsWithUsers = (listings ?? []).map((listing) => ({
      ...listing,
      user: profilesMap.get(listing.user_id) || null,
    }));

    return NextResponse.json({
      listings: listingsWithUsers,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/adoptions", e), { status: 500 });
  }
}
