import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

/** Order statuses that count as "active" for the badge (not yet shipped). */
const ACTIVE_STATUSES = ["payment_pending", "pending", "processing"];

/**
 * GET /api/admin/orders/new-count
 * Returns the number of orders that have not yet reached "Shipped" (status is payment_pending, pending, or processing).
 * Admin only.
 */
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
    const { count, error } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_STATUSES);

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/orders/new-count", error), { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/orders/new-count", e), { status: 500 });
  }
}
