import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/admin/moderation - List moderation log entries (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "pending_review";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("moderation_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action !== "all") {
      query = query.eq("action_taken", action);
    }

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/moderation", error), { status: 500 });
    }

    // Fetch user profiles
    const userIds = new Set<string>();
    for (const e of entries ?? []) {
      userIds.add(e.user_id);
      if (e.reviewed_by) userIds.add(e.reviewed_by);
    }

    let profilesMap = new Map();
    if (userIds.size > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", Array.from(userIds));
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    const enrichedEntries = (entries ?? []).map(entry => ({
      ...entry,
      user: profilesMap.get(entry.user_id) || null,
      reviewer: entry.reviewed_by ? profilesMap.get(entry.reviewed_by) || null : null,
    }));

    return NextResponse.json({ entries: enrichedEntries });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/moderation", e), { status: 500 });
  }
}
