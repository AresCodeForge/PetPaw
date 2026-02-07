import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/user/blocks - List blocked users
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const { data: blocks, error } = await admin
      .from("user_blocks")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/user/blocks", error), { status: 500 });
    }

    // Fetch blocked user profiles
    const blockedIds = (blocks ?? []).map(b => b.blocked_id);
    let profilesMap = new Map();
    if (blockedIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", blockedIds);
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    const enrichedBlocks = (blocks ?? []).map(block => ({
      ...block,
      blocked_user: profilesMap.get(block.blocked_id) || { id: block.blocked_id, name: null, avatar_url: null },
    }));

    return NextResponse.json({ blocks: enrichedBlocks });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/user/blocks", e), { status: 500 });
  }
}

// POST /api/user/blocks - Block a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { blocked_id } = body;

    if (!blocked_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    if (blocked_id === user.id) {
      return NextResponse.json(createError("E4017"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: block, error } = await admin
      .from("user_blocks")
      .upsert({
        blocker_id: user.id,
        blocked_id,
      }, { onConflict: "blocker_id,blocked_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/user/blocks", error), { status: 500 });
    }

    return NextResponse.json({ block }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/user/blocks", e), { status: 500 });
  }
}

// DELETE /api/user/blocks - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blocked_id = searchParams.get("blocked_id");

    if (!blocked_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blocked_id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/user/blocks", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/user/blocks", e), { status: 500 });
  }
}
