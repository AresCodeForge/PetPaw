import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export type ConversationWithDetails = {
  id: string;
  listing_id: string;
  adopter_id: string;
  poster_id: string;
  last_message_at: string;
  created_at: string;
  listing: {
    id: string;
    pet_name: string;
    title: string;
    images: { image_url: string }[];
  };
  other_user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    is_shelter: boolean;
    shelter_name: string | null;
  };
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
};

// GET /api/messages - Get user's conversations
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Get conversations where user is either adopter or poster
    const { data: conversations, error } = await admin
      .from("conversations")
      .select(`
        id,
        listing_id,
        adopter_id,
        poster_id,
        last_message_at,
        created_at,
        listing:adoption_listings(id, pet_name, title, images:adoption_images(image_url)),
        adopter:profiles!conversations_adopter_id_profiles_fkey(id, name, avatar_url, is_shelter, shelter_name),
        poster:profiles!conversations_poster_id_profiles_fkey(id, name, avatar_url, is_shelter, shelter_name)
      `)
      .or(`adopter_id.eq.${user.id},poster_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/messages", error), { status: 500 });
    }

    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations ?? []).map(async (conv) => {
        // Get last message
        const { data: lastMessage } = await admin
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count (messages not from user that are unread)
        const { count: unreadCount } = await admin
          .from("messages")
          .select("id", { count: "exact" })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        // Determine other user
        const isAdopter = conv.adopter_id === user.id;
        const otherUser = isAdopter ? conv.poster : conv.adopter;

        return {
          id: conv.id,
          listing_id: conv.listing_id,
          adopter_id: conv.adopter_id,
          poster_id: conv.poster_id,
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
          listing: conv.listing,
          other_user: otherUser,
          last_message: lastMessage || null,
          unread_count: unreadCount ?? 0,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithDetails });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/messages", e), { status: 500 });
  }
}

// POST /api/messages - Send a message (creates conversation if needed)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { listing_id, conversation_id, content } = body;

    if (!content?.trim()) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    let convId = conversation_id;

    // If no conversation_id, create or find one
    if (!convId && listing_id) {
      // Get the listing to find the poster
      const { data: listing } = await admin
        .from("adoption_listings")
        .select("id, user_id")
        .eq("id", listing_id)
        .single();

      if (!listing) {
        return NextResponse.json(createError("E3010"), { status: 404 });
      }

      // Cannot message own listing
      if (listing.user_id === user.id) {
        return NextResponse.json(createError("E4007"), { status: 400 });
      }

      // Check if conversation already exists
      const { data: existingConv } = await admin
        .from("conversations")
        .select("id")
        .eq("listing_id", listing_id)
        .eq("adopter_id", user.id)
        .single();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await admin
          .from("conversations")
          .insert({
            listing_id,
            adopter_id: user.id,
            poster_id: listing.user_id,
          })
          .select()
          .single();

        if (convError) {
          return NextResponse.json(logAndCreateError("E5002", "POST /api/messages (conv)", convError), { status: 500 });
        }

        convId = newConv.id;
      }
    }

    if (!convId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Verify user is part of conversation
    const { data: conv } = await admin
      .from("conversations")
      .select("adopter_id, poster_id")
      .eq("id", convId)
      .single();

    if (!conv || (conv.adopter_id !== user.id && conv.poster_id !== user.id)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Create message
    const { data: message, error: msgError } = await admin
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/messages (msg)", msgError), { status: 500 });
    }

    // Update conversation last_message_at
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);

    return NextResponse.json({ message, conversation_id: convId }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/messages", e), { status: 500 });
  }
}
