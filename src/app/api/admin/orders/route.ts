import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";
import { maskEmail } from "@/lib/privacy";

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
    const { data: orders, error } = await admin
      .from("orders")
      .select("id, order_number, user_id, status, payment_status, total_amount, total_cents, tracking_number, carrier, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/orders", error), { status: 500 });
    }

    const rows = orders ?? [];
    const userIds = [...new Set(rows.map((o: { user_id: string }) => o.user_id))];
    const emailByUserId: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        emailByUserId[p.id] = maskEmail(p.email);
      }
    }

    const list = rows.map((o: {
      id: string;
      order_number: string | null;
      user_id: string;
      status: string;
      payment_status: string;
      total_amount?: number;
      total_cents?: number | null;
      tracking_number: string | null;
      carrier: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: o.id,
      order_number: o.order_number ?? o.id.slice(0, 8),
      user_id: o.user_id,
      user_email: emailByUserId[o.user_id] ?? null,
      status: o.status,
      payment_status: o.payment_status,
      total_amount: o.total_cents != null ? o.total_cents / 100 : Number(o.total_amount ?? 0),
      tracking_number: o.tracking_number ?? null,
      carrier: o.carrier ?? null,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }));

    return NextResponse.json({ orders: list });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/orders", e), { status: 500 });
  }
}
