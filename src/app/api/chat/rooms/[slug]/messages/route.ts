import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";
import { serverModerateText, checkRateLimit } from "@/lib/moderation";

// Helper: fetch chat roles for a list of user IDs
async function fetchUserRoles(admin: ReturnType<typeof createSupabaseAdminClient>, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, any[]>();
  const { data: assignments } = await admin
    .from("chat_user_roles")
    .select("user_id, chat_roles(name, display_name_en, display_name_el, icon, color, priority, is_administrative, permissions)")
    .in("user_id", userIds);
  const rolesMap = new Map<string, any[]>();
  for (const a of assignments ?? []) {
    const role = (a as any).chat_roles;
    if (!role) continue;
    if (!rolesMap.has(a.user_id)) rolesMap.set(a.user_id, []);
    rolesMap.get(a.user_id)!.push(role);
  }
  return rolesMap;
}

async function getSiteAdminIds(admin: ReturnType<typeof createSupabaseAdminClient>, userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const { data } = await admin.from("profiles").select("id").in("id", userIds).eq("role", "admin");
  return new Set((data ?? []).map(p => p.id));
}

const ADMIN_ROLE_OBJ = {
  name: "admin", display_name_en: "Admin", display_name_el: "Διαχειριστής",
  icon: "ShieldCheck", color: "#1e3a5f", priority: 100, is_administrative: true,
  permissions: ["kick_user","ban_user","silence_user","warn_user","delete_messages","pin_messages","manage_room","assign_roles"],
};

type RouteContext = { params: Promise<{ slug: string }> };

export type ChatMessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to_id: string | null;
  mentions: string[];
  is_deleted: boolean;
  message_type: "user" | "system";
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    user: { name: string | null };
  } | null;
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
};

// GET /api/chat/rooms/[slug]/messages - Get paginated messages
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const before = searchParams.get("before"); // cursor for pagination (message id)
    
    const admin = createSupabaseAdminClient();

    // Get room by slug
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(createError("E3014"), { status: 404 });
    }

    // Build query for messages
    let query = admin
      .from("chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    // If cursor provided, get messages before that one
    if (before) {
      const { data: cursorMsg } = await admin
        .from("chat_messages")
        .select("created_at")
        .eq("id", before)
        .single();
      
      if (cursorMsg) {
        query = query.lt("created_at", cursorMsg.created_at);
      }
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/rooms/[slug]/messages", error), { status: 500 });
    }

    // Filter out messages from blocked users
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabaseAuth.auth.getUser();
    
    let blockedUserIds = new Set<string>();
    if (currentUser) {
      const { data: blocks } = await admin
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", currentUser.id);
      blockedUserIds = new Set((blocks ?? []).map(b => b.blocked_id));
    }

    const filteredMessages = (messages ?? []).filter(m => !blockedUserIds.has(m.user_id));

    // Fetch user profiles
    const userIds = [...new Set(filteredMessages.map(m => m.user_id))];
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Fetch reply_to messages
    const replyIds = [...new Set(filteredMessages.filter(m => m.reply_to_id).map(m => m.reply_to_id))];
    let repliesMap = new Map();
    if (replyIds.length > 0) {
      const { data: replies } = await admin
        .from("chat_messages")
        .select("id, content, user_id")
        .in("id", replyIds);
      
      if (replies) {
        // Get profiles for reply authors
        const replyUserIds = [...new Set(replies.map(r => r.user_id))];
        const { data: replyProfiles } = await admin
          .from("profiles")
          .select("id, name")
          .in("id", replyUserIds);
        const replyProfilesMap = new Map((replyProfiles ?? []).map(p => [p.id, p]));
        
        repliesMap = new Map(replies.map(r => [r.id, {
          id: r.id,
          content: r.content.substring(0, 100),
          user: replyProfilesMap.get(r.user_id) || { name: null }
        }]));
      }
    }

    // Fetch reactions for all messages
    const messageIds = filteredMessages.map(m => m.id);
    let reactionsMap = new Map<string, { emoji: string; count: number; users: string[] }[]>();
    if (messageIds.length > 0) {
      const { data: reactions } = await admin
        .from("chat_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", messageIds);
      
      if (reactions) {
        // Group reactions by message and emoji
        const grouped = new Map<string, Map<string, string[]>>();
        for (const r of reactions) {
          if (!grouped.has(r.message_id)) {
            grouped.set(r.message_id, new Map());
          }
          const msgReactions = grouped.get(r.message_id)!;
          if (!msgReactions.has(r.emoji)) {
            msgReactions.set(r.emoji, []);
          }
          msgReactions.get(r.emoji)!.push(r.user_id);
        }
        
        for (const [msgId, emojiMap] of grouped) {
          const reactionList: { emoji: string; count: number; users: string[] }[] = [];
          for (const [emoji, users] of emojiMap) {
            reactionList.push({ emoji, count: users.length, users });
          }
          reactionsMap.set(msgId, reactionList);
        }
      }
    }

    // Fetch roles for all message authors
    const rolesMap = await fetchUserRoles(admin, userIds);
    const siteAdminIds = await getSiteAdminIds(admin, userIds);

    // Combine data
    const enrichedMessages = filteredMessages.map(msg => {
      const userRoles = [
        ...(siteAdminIds.has(msg.user_id) && !(rolesMap.get(msg.user_id) ?? []).some((r: any) => r.name === "admin")
          ? [ADMIN_ROLE_OBJ] : []),
        ...(rolesMap.get(msg.user_id) ?? []),
      ];
      return {
        ...msg,
        user: profilesMap.get(msg.user_id) || null,
        reply_to: msg.reply_to_id ? repliesMap.get(msg.reply_to_id) || null : null,
        reactions: reactionsMap.get(msg.id) || [],
        roles: userRoles,
      };
    });

    // Reverse to chronological order for display
    enrichedMessages.reverse();

    // Update last read for authenticated user
    if (currentUser && enrichedMessages.length > 0) {
      await admin
        .from("chat_last_read")
        .upsert({
          user_id: currentUser.id,
          room_id: room.id,
          last_read_at: new Date().toISOString(),
        }, { onConflict: "user_id,room_id" });
    }

    return NextResponse.json({
      messages: enrichedMessages,
      has_more: (messages ?? []).length === limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/rooms/[slug]/messages", e), { status: 500 });
  }
}

// POST /api/chat/rooms/[slug]/messages - Send a message
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Get room by slug
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(createError("E3014"), { status: 404 });
    }

    // Check if user is banned (check both legacy chat_bans and new moderation_actions)
    const now = new Date().toISOString();
    
    // Legacy ban table check
    const { data: legacyBan } = await admin
      .from("chat_bans")
      .select("id")
      .eq("user_id", user.id)
      .or(`room_id.is.null,room_id.eq.${room.id}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .single();

    if (legacyBan) {
      return NextResponse.json(createError("E4010"), { status: 403 });
    }

    // New moderation system: check for active ban or silence
    const { data: modActions } = await admin
      .from("chat_moderation_actions")
      .select("action_type, expires_at")
      .eq("user_id", user.id)
      .in("action_type", ["ban", "silence"])
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`room_id.is.null,room_id.eq.${room.id}`);

    const activeBan = (modActions ?? []).find(a => a.action_type === "ban");
    const activeSilence = (modActions ?? []).find(a => a.action_type === "silence");

    if (activeBan) {
      return NextResponse.json(createError("E4010"), { status: 403 });
    }
    if (activeSilence) {
      return NextResponse.json({ error: "You are silenced in this room", code: "E4015" }, { status: 403 });
    }

    // Rate limiting: max 10 messages per 60 seconds
    const rateCheck = await checkRateLimit(user.id, admin, "chat_messages", "user_id", 60, 10);
    if (!rateCheck.allowed) {
      return NextResponse.json(createError("E4014"), { status: 429 });
    }

    const body = await request.json();
    const { content, image_url, reply_to_id, mentions } = body;

    // Validate content
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json(createError("E4011"), { status: 400 });
    }

    // Content moderation
    const modResult = serverModerateText(content.trim());
    
    if (!modResult.allowed) {
      // Log blocked content for admin review
      await admin.from("moderation_log").insert({
        user_id: user.id,
        content_type: "text",
        content_preview: content.substring(0, 200),
        flags: modResult.reason ? [modResult.reason] : ["blocked"],
        action_taken: "blocked",
      });
      return NextResponse.json(createError("E4013"), { status: 403 });
    }

    // Log content that requires review (profanity/spam was filtered)
    if (modResult.requiresReview) {
      await admin.from("moderation_log").insert({
        user_id: user.id,
        content_type: "text",
        content_preview: content.substring(0, 200),
        flags: ["filtered"],
        action_taken: "filtered",
      });
    }

    // Create message with filtered content
    const messageData = {
      room_id: room.id,
      user_id: user.id,
      content: modResult.filteredContent,
      image_url: image_url || null,
      reply_to_id: reply_to_id || null,
      mentions: mentions || [],
    };

    const { data: message, error } = await admin
      .from("chat_messages")
      .insert(messageData)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/rooms/[slug]/messages", error), { status: 500 });
    }

    // Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, name, avatar_url, role")
      .eq("id", user.id)
      .single();

    // Fetch user's chat roles
    const senderRolesMap = await fetchUserRoles(admin, [user.id]);
    const senderRoles = [
      ...(profile?.role === "admin" && !(senderRolesMap.get(user.id) ?? []).some((r: any) => r.name === "admin")
        ? [ADMIN_ROLE_OBJ] : []),
      ...(senderRolesMap.get(user.id) ?? []),
    ];

    // Update presence
    await admin
      .from("chat_presence")
      .upsert({
        user_id: user.id,
        room_id: room.id,
        last_seen: new Date().toISOString(),
        is_online: true,
      }, { onConflict: "user_id,room_id" });

    return NextResponse.json({
      message: {
        ...message,
        user: profile ? { id: profile.id, name: profile.name, avatar_url: profile.avatar_url } : null,
        reactions: [],
        roles: senderRoles,
      }
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/rooms/[slug]/messages", e), { status: 500 });
  }
}
