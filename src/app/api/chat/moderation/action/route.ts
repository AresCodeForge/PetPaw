import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// Duration presets (in minutes)
export const DURATION_PRESETS = {
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "6h": 360,
  "24h": 1440,
  "7d": 10080,
  "30d": 43200,
  permanent: null,
} as const;

// Helper: get requester's moderation permissions
async function getPermissions(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<string[]> {
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    return ["kick_user", "ban_user", "silence_user", "warn_user", "delete_messages", "pin_messages", "manage_room", "assign_roles"];
  }

  const { data: userRoles } = await admin
    .from("chat_user_roles")
    .select("role_id, chat_roles(permissions)")
    .eq("user_id", userId);

  const perms = new Set<string>();
  for (const ur of userRoles ?? []) {
    const rolePerms = (ur as any).chat_roles?.permissions;
    if (Array.isArray(rolePerms)) {
      for (const p of rolePerms) perms.add(p);
    }
  }
  return Array.from(perms);
}

// POST /api/chat/moderation/action - Perform a moderation action
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const perms = await getPermissions(admin, user.id);

    const { action_type, target_user_id, room_slug, duration, reason } = await request.json();

    if (!action_type || !target_user_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Permission check
    const permMap: Record<string, string> = {
      kick: "kick_user",
      ban: "ban_user",
      silence: "silence_user",
      warn: "warn_user",
    };

    if (!perms.includes(permMap[action_type] || "")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Prevent self-moderation
    if (target_user_id === user.id) {
      return NextResponse.json({ error: "Cannot moderate yourself" }, { status: 400 });
    }

    // Prevent moderating someone with higher/equal role priority
    // Check target's chat roles AND site admin status
    const { data: targetRoles } = await admin
      .from("chat_user_roles")
      .select("chat_roles(priority)")
      .eq("user_id", target_user_id);

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", target_user_id)
      .single();

    // Site admins have effective priority 999
    const targetBasePriority = targetProfile?.role === "admin" ? 999 : 0;
    const targetMaxPriority = Math.max(targetBasePriority, ...(targetRoles ?? []).map((r: any) => r.chat_roles?.priority ?? 0));

    const { data: issuerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const issuerBasePriority = issuerProfile?.role === "admin" ? 999 : 0;
    
    // Also check chat roles for issuer
    const { data: issuerRoles } = await admin
      .from("chat_user_roles")
      .select("chat_roles(priority)")
      .eq("user_id", user.id);

    let maxIssuerPriority = issuerBasePriority;
    for (const r of issuerRoles ?? []) {
      const p = (r as any).chat_roles?.priority ?? 0;
      if (p > maxIssuerPriority) maxIssuerPriority = p;
    }

    if (targetMaxPriority >= maxIssuerPriority) {
      return NextResponse.json({ error: "Cannot moderate a user with equal or higher role" }, { status: 403 });
    }

    // Resolve room_id
    let roomId: string | null = null;
    if (room_slug) {
      const { data: room } = await admin
        .from("chat_rooms")
        .select("id")
        .eq("slug", room_slug)
        .single();
      roomId = room?.id || null;
    }

    // Calculate expiry
    const durationMinutes = duration ? (DURATION_PRESETS as any)[duration] ?? null : null;
    const expiresAt = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null;

    // Insert moderation action
    const { data: action, error: insertErr } = await admin
      .from("chat_moderation_actions")
      .insert({
        user_id: target_user_id,
        room_id: roomId,
        action_type,
        reason: reason || null,
        duration_minutes: durationMinutes,
        expires_at: expiresAt,
        issued_by: user.id,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/moderation/action", insertErr), { status: 500 });
    }

    // For kicks, set presence to offline
    if (action_type === "kick" && roomId) {
      await admin
        .from("chat_presence")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("user_id", target_user_id)
        .eq("room_id", roomId);
    }

    // For bans, also set presence offline
    if (action_type === "ban") {
      if (roomId) {
        await admin
          .from("chat_presence")
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq("user_id", target_user_id)
          .eq("room_id", roomId);
      } else {
        // Global ban — offline in all rooms
        await admin
          .from("chat_presence")
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq("user_id", target_user_id);
      }
    }

    return NextResponse.json({ success: true, action }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/moderation/action", e), { status: 500 });
  }
}

// DELETE /api/chat/moderation/action - Revoke (undo) an active moderation action
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const perms = await getPermissions(admin, user.id);

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("action_id");
    const targetUserId = searchParams.get("user_id");
    const actionType = searchParams.get("action_type"); // "ban" | "silence"
    const roomSlug = searchParams.get("room_slug");

    // Method 1: revoke by action ID
    if (actionId) {
      // Verify the action exists
      const { data: action } = await admin
        .from("chat_moderation_actions")
        .select("*")
        .eq("id", actionId)
        .single();

      if (!action) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      // Need matching permission
      const permNeeded = action.action_type === "ban" ? "ban_user" : action.action_type === "silence" ? "silence_user" : "kick_user";
      if (!perms.includes(permNeeded)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      await admin
        .from("chat_moderation_actions")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("id", actionId);

      return NextResponse.json({ success: true });
    }

    // Method 2: revoke all active actions of a type for a user
    if (targetUserId && actionType) {
      const permNeeded = actionType === "ban" ? "ban_user" : actionType === "silence" ? "silence_user" : "kick_user";
      if (!perms.includes(permNeeded)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      const now = new Date().toISOString();

      let query = admin
        .from("chat_moderation_actions")
        .update({ revoked_at: now, revoked_by: user.id })
        .eq("user_id", targetUserId)
        .eq("action_type", actionType)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      if (roomSlug) {
        const { data: room } = await admin
          .from("chat_rooms")
          .select("id")
          .eq("slug", roomSlug)
          .single();
        if (room) {
          query = query.or(`room_id.is.null,room_id.eq.${room.id}`);
        }
      }

      await query;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action_id or (user_id + action_type) required" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/chat/moderation/action", e), { status: 500 });
  }
}

// GET /api/chat/moderation/action?user_id=X&room_slug=Y - Check active bans/silences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const roomSlug = searchParams.get("room_slug");

    if (!userId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    let roomId: string | null = null;
    if (roomSlug) {
      const { data: room } = await admin
        .from("chat_rooms")
        .select("id")
        .eq("slug", roomSlug)
        .single();
      roomId = room?.id || null;
    }

    // Find active actions (not expired, not revoked)
    let query = admin
      .from("chat_moderation_actions")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (roomId) {
      query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
    }

    const { data: actions, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/moderation/action", error), { status: 500 });
    }

    const isBanned = (actions ?? []).some((a) => a.action_type === "ban");
    const isSilenced = (actions ?? []).some((a) => a.action_type === "silence");

    return NextResponse.json({ actions: actions ?? [], is_banned: isBanned, is_silenced: isSilenced });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/moderation/action", e), { status: 500 });
  }
}
