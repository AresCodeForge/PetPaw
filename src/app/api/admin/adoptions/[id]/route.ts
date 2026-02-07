import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/admin/adoptions/[id] - Update listing (approve/reject)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const { is_approved, status } = body;

    const admin = createSupabaseAdminClient();

    const updateData: Record<string, unknown> = {};
    if (is_approved !== undefined) updateData.is_approved = is_approved;
    if (status !== undefined) updateData.status = status;

    const { data: listing, error } = await admin
      .from("adoption_listings")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        images:adoption_images(id, image_url, display_order),
        user:profiles!adoption_listings_user_id_profiles_fkey(id, name, email, is_shelter, shelter_name)
      `)
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PUT /api/admin/adoptions/[id]", error), { status: 500 });
    }

    return NextResponse.json({ listing });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PUT /api/admin/adoptions/[id]", e), { status: 500 });
  }
}

// DELETE /api/admin/adoptions/[id] - Delete listing
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("adoption_listings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/adoptions/[id]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/adoptions/[id]", e), { status: 500 });
  }
}
