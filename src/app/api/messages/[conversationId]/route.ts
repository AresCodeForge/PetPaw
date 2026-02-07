import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ conversationId: string }> };

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
};

// GET /api/messages/[conversationId] - Get messages in a conversation
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Verify user is part of conversation
    const { data: conv } = await admin
      .from("conversations")
      .select(`
        id,
        adopter_id,
        poster_id,
        listing_id,
        listing:adoption_listings(id, pet_name, title)
      `)
      .eq("id", conversationId)
      .single();

    if (!conv) {
      return NextResponse.json(createError("E3011"), { status: 404 });
    }

    if (conv.adopter_id !== user.id && conv.poster_id !== user.id) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Get messages with sender info
    const { data: messages, error } = await admin
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        is_read,
        created_at,
        sender:profiles!messages_sender_id_profiles_fkey(id, name, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/messages/[conversationId]", error), { status: 500 });
    }

    // Get other user info
    const otherUserId = conv.adopter_id === user.id ? conv.poster_id : conv.adopter_id;
    const { data: otherUser } = await admin
      .from("profiles")
      .select("id, name, avatar_url, is_shelter, shelter_name")
      .eq("id", otherUserId)
      .single();

    return NextResponse.json({
      conversation: {
        id: conv.id,
        listing_id: conv.listing_id,
        listing: conv.listing,
        other_user: otherUser,
      },
      messages: messages ?? [],
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/messages/[conversationId]", e), { status: 500 });
  }
}
