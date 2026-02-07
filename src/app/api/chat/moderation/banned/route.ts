import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/chat/moderation/banned - List all actively banned/silenced users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json(createError("E1001"), { status: 401 });

    const admin = createSupabaseAdminClient();

    // Check permissions - must be admin, moderator, or helper with ban_user/silence_user
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let hasPermission = profile?.role === "admin";

    if (!hasPermission) {
      const { data: userRoles } = await admin
        .from("chat_user_roles")
        .select("chat_roles(permissions)")
        .eq("user_id", user.id);

      for (const ur of userRoles ?? []) {
        const perms = (ur as any).chat_roles?.permissions;
        if (Array.isArray(perms) && (perms.includes("ban_user") || perms.includes("silence_user"))) {
          hasPermission = true;
          break;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Fetch all active (non-expired, non-revoked) ban and silence actions
    const { data: actions, error } = await admin
      .from("chat_moderation_actions")
      .select("id, user_id, room_id, action_type, reason, duration_minutes, expires_at, issued_at, issued_by")
      .in("action_type", ["ban", "silence"])
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("issued_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/moderation/banned", error), { status: 500 });
    }

    // Fetch profiles for all affected users and issuers
    const userIds = new Set<string>();
    for (const a of actions ?? []) {
      userIds.add(a.user_id);
      if (a.issued_by) userIds.add(a.issued_by);
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", Array.from(userIds));

    const profileMap = new Map<string, { name: string | null; avatar_url: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { name: p.name, avatar_url: p.avatar_url });
    }

    // Fetch room names for room-specific bans
    const roomIds = new Set<string>();
    for (const a of actions ?? []) {
      if (a.room_id) roomIds.add(a.room_id);
    }

    let roomMap = new Map<string, string>();
    if (roomIds.size > 0) {
      const { data: rooms } = await admin
        .from("chat_rooms")
        .select("id, name_en")
        .in("id", Array.from(roomIds));
      for (const r of rooms ?? []) {
        roomMap.set(r.id, r.name_en);
      }
    }

    const result = (actions ?? []).map(a => ({
      id: a.id,
      user_id: a.user_id,
      user_name: profileMap.get(a.user_id)?.name || "Unknown",
      user_avatar: profileMap.get(a.user_id)?.avatar_url || null,
      action_type: a.action_type,
      reason: a.reason,
      duration_minutes: a.duration_minutes,
      expires_at: a.expires_at,
      issued_at: a.issued_at,
      issued_by_name: profileMap.get(a.issued_by)?.name || "Unknown",
      room_name: a.room_id ? (roomMap.get(a.room_id) || "Unknown Room") : "Global",
    }));

    return NextResponse.json({ actions: result });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/moderation/banned", e), { status: 500 });
  }
}
