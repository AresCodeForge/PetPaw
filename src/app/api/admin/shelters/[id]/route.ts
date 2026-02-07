import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/admin/shelters/[id] - Approve or reject shelter application
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
    const { status, admin_notes } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Get the application
    const { data: application } = await admin
      .from("shelter_applications")
      .select("user_id, organization_name")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json(createError("E3013"), { status: 404 });
    }

    // Update application
    const { data: updatedApp, error } = await admin
      .from("shelter_applications")
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PUT /api/admin/shelters/[id]", error), { status: 500 });
    }

    // If approved, update user profile
    if (status === "approved") {
      await admin
        .from("profiles")
        .update({
          is_shelter: true,
          shelter_name: application.organization_name,
          shelter_verified_at: new Date().toISOString(),
        })
        .eq("id", application.user_id);
    }

    return NextResponse.json({ application: updatedApp });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PUT /api/admin/shelters/[id]", e), { status: 500 });
  }
}
