import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/dm/conversations - List user's DM conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Get all conversations for this user
    const { data: conversations, error } = await admin
      .from("dm_conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/dm/conversations", error), { status: 500 });
    }

    // Get profiles for all participants
    const participantIds = new Set<string>();
    for (const conv of conversations ?? []) {
      participantIds.add(conv.participant_1);
      participantIds.add(conv.participant_2);
    }
    participantIds.delete(user.id);

    let profilesMap = new Map();
    if (participantIds.size > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url, public_key")
        .in("id", Array.from(participantIds));
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Get unread counts for each conversation
    const conversationIds = (conversations ?? []).map(c => c.id);
    let unreadMap = new Map<string, number>();
    if (conversationIds.length > 0) {
      const { data: unreadCounts } = await admin
        .from("dm_messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      for (const msg of unreadCounts ?? []) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
      }
    }

    // Get last message for each conversation
    let lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    if (conversationIds.length > 0) {
      for (const convId of conversationIds) {
        const { data: lastMsg } = await admin
          .from("dm_messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (lastMsg) {
          lastMessageMap.set(convId, lastMsg);
        }
      }
    }

    // Enrich conversations
    const enrichedConversations = (conversations ?? []).map(conv => {
      const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      return {
        ...conv,
        other_user: profilesMap.get(otherUserId) || { id: otherUserId, name: null, avatar_url: null },
        unread_count: unreadMap.get(conv.id) || 0,
        last_message: lastMessageMap.get(conv.id) || null,
      };
    });

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/dm/conversations", e), { status: 500 });
  }
}

// POST /api/dm/conversations - Create or get existing DM conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { other_user_id } = body;

    if (!other_user_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    if (other_user_id === user.id) {
      return NextResponse.json(createError("E4007"), { status: 400 }); // Can't message yourself
    }

    const admin = createSupabaseAdminClient();

    // Check if conversation already exists
    const { data: existing } = await admin
      .from("dm_conversations")
      .select("*")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${other_user_id}),and(participant_1.eq.${other_user_id},participant_2.eq.${user.id})`)
      .single();

    if (existing) {
      // Return existing conversation
      const { data: otherProfile } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", other_user_id)
        .single();

      return NextResponse.json({
        conversation: {
          ...existing,
          other_user: otherProfile || { id: other_user_id, name: null, avatar_url: null },
        },
        created: false,
      });
    }

    // Create new conversation
    const { data: conversation, error } = await admin
      .from("dm_conversations")
      .insert({
        participant_1: user.id,
        participant_2: other_user_id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/dm/conversations", error), { status: 500 });
    }

    // Get other user's profile
    const { data: otherProfile } = await admin
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", other_user_id)
      .single();

    return NextResponse.json({
      conversation: {
        ...conversation,
        other_user: otherProfile || { id: other_user_id, name: null, avatar_url: null },
      },
      created: true,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/dm/conversations", e), { status: 500 });
  }
}
