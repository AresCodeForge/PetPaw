import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";
import { maskEmail } from "@/lib/privacy";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  tier: "free" | "pro";
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("profiles")
      .select("id, name, email, tier, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/users", error), { status: 500 });
    }

    const list: AdminUserRow[] = (rows ?? []).map((p: { id: string; name: string | null; email: string | null; tier: string | null; created_at: string }) => ({
      id: p.id,
      name: p.name ?? null,
      email: maskEmail(p.email),
      tier: p.tier === "pro" ? "pro" : "free",
      created_at: p.created_at,
    }));

    return NextResponse.json({ users: list });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/users", e), { status: 500 });
  }
}
