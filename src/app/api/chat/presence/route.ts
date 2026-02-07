import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

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

// POST /api/chat/presence - Update user presence (heartbeat / enter / leave)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { room_slug, is_online } = body;

    if (!room_slug) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Get room by slug
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", room_slug)
      .eq("is_active", true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(createError("E3014"), { status: 404 });
    }

    const now = new Date().toISOString();

    if (is_online !== false) {
      // --- ENTERING A ROOM ---

      // Check for active ban before allowing entry
      const { data: activeBans } = await admin
        .from("chat_moderation_actions")
        .select("id")
        .eq("user_id", user.id)
        .eq("action_type", "ban")
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .or(`room_id.is.null,room_id.eq.${room.id}`)
        .limit(1);

      if (activeBans && activeBans.length > 0) {
        return NextResponse.json({ error: "You are banned from this room", code: "E4010" }, { status: 403 });
      }

      // Check if user was already online in THIS room
      const { data: existingPresence } = await admin
        .from("chat_presence")
        .select("is_online")
        .eq("user_id", user.id)
        .eq("room_id", room.id)
        .single();

      // Mark user offline in ALL OTHER rooms
      await admin
        .from("chat_presence")
        .update({ is_online: false, last_seen: now })
        .eq("user_id", user.id)
        .neq("room_id", room.id)
        .eq("is_online", true);

      // Upsert presence for this room
      const { error } = await admin
        .from("chat_presence")
        .upsert({
          user_id: user.id,
          room_id: room.id,
          last_seen: now,
          is_online: true,
        }, { onConflict: "user_id,room_id" });

      if (error) {
        return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/presence", error), { status: 500 });
      }
    } else {
      // --- LEAVING A ROOM ---
      const { error } = await admin
        .from("chat_presence")
        .update({ is_online: false, last_seen: now })
        .eq("user_id", user.id)
        .eq("room_id", room.id);

      if (error) {
        return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/presence", error), { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/presence", e), { status: 500 });
  }
}

// GET /api/chat/presence - Get online users in a room (includes roles)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("room_slug");

    if (!roomSlug) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Get room by slug
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", roomSlug)
      .eq("is_active", true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(createError("E3014"), { status: 404 });
    }

    // Get online users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: presenceData, error } = await admin
      .from("chat_presence")
      .select("user_id, last_seen")
      .eq("room_id", room.id)
      .eq("is_online", true)
      .gte("last_seen", fiveMinutesAgo);

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/presence", error), { status: 500 });
    }

    // Fetch user profiles
    const userIds = (presenceData ?? []).map(p => p.user_id);
    let users: { id: string; name: string | null; avatar_url: string | null; roles?: any[] }[] = [];
    
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      // Fetch roles for all online users
      const rolesMap = await fetchUserRoles(admin, userIds);

      // Also check site-wide admins
      const { data: adminProfiles } = await admin
        .from("profiles")
        .select("id")
        .in("id", userIds)
        .eq("role", "admin");
      const siteAdminIds = new Set((adminProfiles ?? []).map(p => p.id));

      // Fetch active moderation actions (ban/silence) for all online users
      const now = new Date().toISOString();
      const { data: modActions } = await admin
        .from("chat_moderation_actions")
        .select("user_id, action_type, expires_at")
        .in("user_id", userIds)
        .in("action_type", ["ban", "silence"])
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .or(`room_id.is.null,room_id.eq.${room.id}`);

      const modStatusMap = new Map<string, { is_banned: boolean; is_silenced: boolean }>();
      for (const a of modActions ?? []) {
        if (!modStatusMap.has(a.user_id)) modStatusMap.set(a.user_id, { is_banned: false, is_silenced: false });
        const entry = modStatusMap.get(a.user_id)!;
        if (a.action_type === "ban") entry.is_banned = true;
        if (a.action_type === "silence") entry.is_silenced = true;
      }

      users = (profiles ?? []).map(p => ({
        ...p,
        roles: [
          // If site-wide admin, always include the admin chat role
          ...(siteAdminIds.has(p.id) && !(rolesMap.get(p.id) ?? []).some((r: any) => r.name === "admin")
            ? [{
                name: "admin",
                display_name_en: "Admin",
                display_name_el: "Διαχειριστής",
                icon: "ShieldCheck",
                color: "#1e3a5f",
                priority: 100,
                is_administrative: true,
                permissions: ["kick_user", "ban_user", "silence_user", "warn_user", "delete_messages", "pin_messages", "manage_room", "assign_roles"],
              }]
            : []),
          ...(rolesMap.get(p.id) ?? []),
        ],
        is_banned: modStatusMap.get(p.id)?.is_banned ?? false,
        is_silenced: modStatusMap.get(p.id)?.is_silenced ?? false,
      }));
    }

    return NextResponse.json({ users, count: users.length });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/presence", e), { status: 500 });
  }
}
