import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/admin/chat/bans - List all bans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check if user is admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    // Build query
    let query = admin
      .from("chat_bans")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly) {
      // Only get bans that haven't expired
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }

    const { data: bans, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/chat/bans", error), { status: 500 });
    }

    // Fetch user profiles for banned users
    const userIds = [...new Set((bans ?? []).flatMap(b => [b.user_id, b.banned_by]))];
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Fetch room names
    const roomIds = [...new Set((bans ?? []).filter(b => b.room_id).map(b => b.room_id))];
    let roomsMap = new Map();
    if (roomIds.length > 0) {
      const { data: rooms } = await admin
        .from("chat_rooms")
        .select("id, slug, name_en, name_el")
        .in("id", roomIds);
      roomsMap = new Map((rooms ?? []).map(r => [r.id, r]));
    }

    const enrichedBans = (bans ?? []).map(ban => ({
      ...ban,
      user: profilesMap.get(ban.user_id) || null,
      banned_by_user: profilesMap.get(ban.banned_by) || null,
      room: ban.room_id ? roomsMap.get(ban.room_id) || null : null,
    }));

    return NextResponse.json({ bans: enrichedBans });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/chat/bans", e), { status: 500 });
  }
}

// POST /api/admin/chat/bans - Create a new ban
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check if user is admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const { user_id, room_id, reason, duration_hours } = body;

    if (!user_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Calculate expiry if duration provided
    let expires_at = null;
    if (duration_hours && typeof duration_hours === "number") {
      expires_at = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
    }

    const banData = {
      user_id,
      room_id: room_id || null,
      banned_by: user.id,
      reason: reason || null,
      expires_at,
    };

    const { data: ban, error } = await admin
      .from("chat_bans")
      .insert(banData)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/admin/chat/bans", error), { status: 500 });
    }

    return NextResponse.json({ ban }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/admin/chat/bans", e), { status: 500 });
  }
}
