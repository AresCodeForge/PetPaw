import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/admin/reports/[id] - Update report status (admin only)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const { status, resolution_notes } = body;

    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const updateData: Record<string, unknown> = {
      status,
      resolution_notes: resolution_notes || null,
    };

    // Set resolved_by and resolved_at when resolving/dismissing
    if (status === "resolved" || status === "dismissed") {
      updateData.resolved_by = user.id;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: report, error } = await admin
      .from("reported_content")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/admin/reports/[id]", error), { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/reports/[id]", e), { status: 500 });
  }
}
