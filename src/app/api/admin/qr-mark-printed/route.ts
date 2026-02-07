import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();

    let ids: string[] = [];

    const shortCode = typeof body.short_code === "string" ? body.short_code.trim() : null;
    if (shortCode) {
      const { data: row } = await admin.from("qr_codes").select("id").eq("short_code", shortCode).single();
      if (row) ids = [row.id];
    } else if (typeof body.count === "number" && body.count > 0) {
      const count = Math.min(Math.max(Math.floor(body.count), 1), 500);
      const { data: rows } = await admin
        .from("qr_codes")
        .select("id")
        .is("printed_at", null)
        .is("pet_id", null)
        .order("created_at", { ascending: false })
        .limit(count);
      ids = (rows ?? []).map((r) => r.id);
    } else if (Array.isArray(body.ids)) {
      ids = body.ids as string[];
    }

    if (ids.length === 0) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const { error } = await admin.from("qr_codes").update({ printed_at: new Date().toISOString() }).in("id", ids);
    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "qr-mark-printed update", error), { status: 500 });
    }
    return NextResponse.json({ ok: true, marked: ids.length });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "qr-mark-printed", e), { status: 500 });
  }
}
