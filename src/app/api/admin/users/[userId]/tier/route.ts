import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteParams = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const tier = body.tier === "pro" ? "pro" : body.tier === "free" ? "free" : null;
    if (tier === null) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    
    // First check if the profile exists
    const { data: existingProfile, error: selectError } = await admin
      .from("profiles")
      .select("id, tier")
      .eq("id", userId)
      .single();

    if (selectError || !existingProfile) {
      // Profile doesn't exist - create it
      const { data: inserted, error: insertError } = await admin
        .from("profiles")
        .insert({ id: userId, tier })
        .select("id, tier")
        .single();
      
      if (insertError) {
        return NextResponse.json(logAndCreateError("E5002", "PATCH tier - insert profile", insertError), { status: 500 });
      }
      return NextResponse.json({ ok: true, tier: inserted?.tier, created: true });
    }

    // Profile exists - update it
    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ tier })
      .eq("id", userId)
      .select("id, tier")
      .single();

    if (updateError) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/admin/users/[userId]/tier", updateError), { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      tier: updated?.tier ?? tier
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/users/[userId]/tier", e), { status: 500 });
  }
}
