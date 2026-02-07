import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// Helper: check if requester has the permission to assign roles
async function getRequesterPermissions(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<string[]> {
  // Check if site-wide admin
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    return ["kick_user", "ban_user", "silence_user", "warn_user", "delete_messages", "pin_messages", "manage_room", "assign_roles"];
  }

  // Check chat roles
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

// POST /api/chat/roles/assign - Assign a role to a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const perms = await getRequesterPermissions(admin, user.id);

    if (!perms.includes("assign_roles")) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { user_id, role_name, room_id } = await request.json();

    if (!user_id || !role_name) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Get the role
    const { data: role, error: roleErr } = await admin
      .from("chat_roles")
      .select("id, priority, is_administrative")
      .eq("name", role_name)
      .single();

    if (roleErr || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Non-admin users cannot assign admin role
    const { data: selfProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (role_name === "admin" && selfProfile?.role !== "admin") {
      return NextResponse.json({ error: "Only site admins can assign the admin role" }, { status: 403 });
    }

    // Insert assignment
    const { error: insertErr } = await admin
      .from("chat_user_roles")
      .upsert({
        user_id,
        role_id: role.id,
        room_id: room_id || null,
        assigned_by: user.id,
      }, { onConflict: "user_id,role_id,room_id" });

    if (insertErr) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/chat/roles/assign", insertErr), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/roles/assign", e), { status: 500 });
  }
}

// DELETE /api/chat/roles/assign - Remove a role from a user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const perms = await getRequesterPermissions(admin, user.id);

    if (!perms.includes("assign_roles")) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const roleName = searchParams.get("role_name");

    if (!userId || !roleName) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Get the role id
    const { data: role } = await admin
      .from("chat_roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await admin
      .from("chat_user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", role.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/chat/roles/assign", e), { status: 500 });
  }
}
