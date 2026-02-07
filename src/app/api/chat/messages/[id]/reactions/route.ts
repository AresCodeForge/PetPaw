import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/chat/messages/[id]/reactions - Add a reaction
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: messageId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Verify message exists
    const { data: message, error: msgError } = await admin
      .from("chat_messages")
      .select("id")
      .eq("id", messageId)
      .eq("is_deleted", false)
      .single();

    if (msgError || !message) {
      return NextResponse.json(createError("E3015"), { status: 404 });
    }

    // Add reaction (upsert to handle duplicates)
    const { data: reaction, error } = await admin
      .from("chat_reactions")
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
      }, { onConflict: "message_id,user_id,emoji" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/messages/[id]/reactions", error), { status: 500 });
    }

    return NextResponse.json({ reaction }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/messages/[id]/reactions", e), { status: 500 });
  }
}

// DELETE /api/chat/messages/[id]/reactions - Remove a reaction
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: messageId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get("emoji");

    if (!emoji) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("chat_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/chat/messages/[id]/reactions", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/chat/messages/[id]/reactions", e), { status: 500 });
  }
}
