import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// PUT /api/messages/read - Mark messages as read
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Verify user is part of conversation
    const { data: conv } = await admin
      .from("conversations")
      .select("adopter_id, poster_id")
      .eq("id", conversation_id)
      .single();

    if (!conv || (conv.adopter_id !== user.id && conv.poster_id !== user.id)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Mark messages from other user as read
    const { error } = await admin
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversation_id)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PUT /api/messages/read", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PUT /api/messages/read", e), { status: 500 });
  }
}
