import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/admin/moderation/[id] - Review a moderation log entry (admin only)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const { action_taken } = body;

    const validActions = ["allowed", "filtered", "blocked", "pending_review"];
    if (!action_taken || !validActions.includes(action_taken)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: entry, error } = await admin
      .from("moderation_log")
      .update({
        action_taken,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/admin/moderation/[id]", error), { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/moderation/[id]", e), { status: 500 });
  }
}
