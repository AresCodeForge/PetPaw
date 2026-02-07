import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";
import { serverModerateText, checkRateLimit } from "@/lib/moderation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/dm/conversations/[id]/messages - Get messages in a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await admin
      .from("dm_conversations")
      .select("*")
      .eq("id", id)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(createError("E3001"), { status: 404 });
    }

    // Get query params for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const before = searchParams.get("before");

    // Build query
    let query = admin
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/dm/conversations/[id]/messages", error), { status: 500 });
    }

    // Get profiles for message senders
    const senderIds = [...new Set((messages ?? []).map(m => m.sender_id))];
    let profilesMap = new Map();
    if (senderIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", senderIds);
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Enrich messages
    const enrichedMessages = (messages ?? []).map(msg => ({
      ...msg,
      sender: profilesMap.get(msg.sender_id) || { id: msg.sender_id, name: null, avatar_url: null },
    })).reverse(); // Return in chronological order

    // Mark messages as read (those not sent by this user)
    const unreadIds = (messages ?? [])
      .filter(m => m.sender_id !== user.id && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await admin
        .from("dm_messages")
        .update({ is_read: true })
        .in("id", unreadIds);
    }

    return NextResponse.json({
      messages: enrichedMessages,
      has_more: (messages ?? []).length === limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/dm/conversations/[id]/messages", e), { status: 500 });
  }
}

// POST /api/dm/conversations/[id]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { content, image_url, encrypted_content } = body;

    if (!content?.trim() && !image_url) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    if (content && content.length > 2000) {
      return NextResponse.json(createError("E4011"), { status: 400 }); // Message too long
    }

    const admin = createSupabaseAdminClient();

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await admin
      .from("dm_conversations")
      .select("*")
      .eq("id", id)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(createError("E3001"), { status: 404 });
    }

    // Rate limiting: max 15 DMs per 60 seconds
    const rateCheck = await checkRateLimit(user.id, admin, "dm_messages", "sender_id", 60, 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(createError("E4014"), { status: 429 });
    }

    // Content moderation (only for non-encrypted messages)
    let finalContent = content?.trim() || "";
    let requiresReview = false;
    
    if (!encrypted_content && finalContent) {
      const modResult = serverModerateText(finalContent);
      
      if (!modResult.allowed) {
        // Log for admin review
        await admin.from("moderation_log").insert({
          user_id: user.id,
          content_type: "text",
          content_preview: finalContent.substring(0, 200),
          flags: ["blocked"],
          action_taken: "blocked",
        });
        
        return NextResponse.json(
          { error: "E4013", code: "E4013", message: "Message blocked by moderation" },
          { status: 400 }
        );
      }
      
      finalContent = modResult.filteredContent;
      requiresReview = modResult.requiresReview;
      
      // Log if requires review
      if (requiresReview) {
        await admin.from("moderation_log").insert({
          user_id: user.id,
          content_type: "text",
          content_preview: finalContent.substring(0, 200),
          flags: ["filtered"],
          action_taken: "filtered",
        });
      }
    }

    // Create message
    const { data: message, error } = await admin
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content: finalContent,
        image_url: image_url || null,
        encrypted_content: encrypted_content || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/dm/conversations/[id]/messages", error), { status: 500 });
    }

    // Get sender profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      message: {
        ...message,
        sender: profile || { id: user.id, name: null, avatar_url: null },
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/dm/conversations/[id]/messages", e), { status: 500 });
  }
}
