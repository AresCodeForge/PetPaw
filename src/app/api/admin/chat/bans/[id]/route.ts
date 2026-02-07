import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/admin/chat/bans/[id] - Remove a ban
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: banId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check if user is admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Delete the ban
    const { error } = await admin
      .from("chat_bans")
      .delete()
      .eq("id", banId);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/chat/bans/[id]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/chat/bans/[id]", e), { status: 500 });
  }
}
