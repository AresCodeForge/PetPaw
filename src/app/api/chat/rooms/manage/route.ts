import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// Helper: check if user is a site-wide admin
async function requireAdmin(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

// POST /api/chat/rooms/manage - Create a new room (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json(createError("E1001"), { status: 401 });

    const admin = createSupabaseAdminClient();
    const isAdmin = await requireAdmin(admin, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { slug, name_en, name_el, description_en, description_el, icon } = await request.json();

    if (!slug || !name_en) {
      return NextResponse.json({ error: "slug and name_en are required" }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existing } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Room slug already exists" }, { status: 409 });
    }

    // Get max display_order
    const { data: lastRoom } = await admin
      .from("chat_rooms")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastRoom?.display_order ?? 0) + 1;

    const { data: room, error: insertErr } = await admin
      .from("chat_rooms")
      .insert({
        slug,
        name_en,
        name_el: name_el || name_en,
        description_en: description_en || null,
        description_el: description_el || null,
        icon: icon || null,
        type: "topic",
        display_order: nextOrder,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/rooms/manage", insertErr), { status: 500 });
    }

    return NextResponse.json({ room }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/rooms/manage", e), { status: 500 });
  }
}

// PUT /api/chat/rooms/manage - Update a room (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json(createError("E1001"), { status: 401 });

    const admin = createSupabaseAdminClient();
    const isAdmin = await requireAdmin(admin, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id, name_en, name_el, description_en, description_el, icon } = await request.json();

    if (!id || !name_en) {
      return NextResponse.json({ error: "id and name_en are required" }, { status: 400 });
    }

    const { data: room, error: updateErr } = await admin
      .from("chat_rooms")
      .update({
        name_en,
        name_el: name_el || name_en,
        description_en: description_en || null,
        description_el: description_el || null,
        icon: icon || null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json(logAndCreateError("E5002", "PUT /api/chat/rooms/manage", updateErr), { status: 500 });
    }

    return NextResponse.json({ room });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PUT /api/chat/rooms/manage", e), { status: 500 });
  }
}

// DELETE /api/chat/rooms/manage?id=... - Soft-delete a room (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json(createError("E1001"), { status: 401 });

    const admin = createSupabaseAdminClient();
    const isAdmin = await requireAdmin(admin, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Soft delete — set is_active = false
    const { error: deleteErr } = await admin
      .from("chat_rooms")
      .update({ is_active: false })
      .eq("id", id);

    if (deleteErr) {
      return NextResponse.json(logAndCreateError("E5002", "DELETE /api/chat/rooms/manage", deleteErr), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/chat/rooms/manage", e), { status: 500 });
  }
}
