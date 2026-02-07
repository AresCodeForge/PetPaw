import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/admin/chat/messages/[id] - Admin delete (soft delete) a message
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: messageId } = await context.params;
    
    // Verify admin
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

    // Verify message exists
    const { data: message, error: msgError } = await admin
      .from("chat_messages")
      .select("id")
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      return NextResponse.json(createError("E3015"), { status: 404 });
    }

    // Soft delete the message
    const { error } = await admin
      .from("chat_messages")
      .update({
        is_deleted: true,
        deleted_by: user.id,
      })
      .eq("id", messageId);

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "DELETE /api/admin/chat/messages/[id]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/chat/messages/[id]", e), { status: 500 });
  }
}
