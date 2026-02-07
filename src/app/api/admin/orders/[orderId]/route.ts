import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

const ALLOWED_STATUSES = ["payment_pending", "pending", "processing", "shipped", "delivered", "cancelled"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        user_id,
        status,
        payment_status,
        total_amount,
        total_cents,
        tracking_number,
        carrier,
        created_at,
        updated_at,
        shipping_address_id
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(createError("E3002"), { status: 404 });
    }

    const [itemsRes, addressRes] = await Promise.all([
      admin
        .from("order_items")
        .select("id, product_id, quantity, price_per_item, products ( name )")
        .eq("order_id", orderId),
      admin
        .from("shipping_addresses")
        .select("id, full_name, address_line1, address_line2, city, state, postal_code, country, phone")
        .eq("id", order.shipping_address_id)
        .single(),
    ]);

    if (itemsRes.error) {
      return NextResponse.json(logAndCreateError("E5001", "GET admin order items", itemsRes.error), { status: 500 });
    }

    const items = (itemsRes.data ?? []).map((row: { id: string; product_id: string; quantity: number; price_per_item: number; products: { name: string } | null }) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.products?.name ?? null,
      quantity: row.quantity,
      price_per_item: Number(row.price_per_item),
      line_total: row.quantity * Number(row.price_per_item),
    }));

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number ?? order.id.slice(0, 8),
        user_id: order.user_id,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: order.total_cents != null ? order.total_cents / 100 : Number(order.total_amount ?? 0),
        tracking_number: order.tracking_number ?? null,
        carrier: order.carrier ?? null,
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
      items,
      shipping_address: addressRes.data ?? null,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/orders/[orderId]", e), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: { status?: string; tracking_number?: string | null; carrier?: string | null } = {};

    if (body.status !== undefined) {
      const s = String(body.status);
      if (!ALLOWED_STATUSES.includes(s as (typeof ALLOWED_STATUSES)[number])) {
        return NextResponse.json(createError("E2002"), { status: 400 });
      }
      updates.status = s;
    }
    if (body.tracking_number !== undefined) {
      updates.tracking_number = body.tracking_number === null || body.tracking_number === "" ? null : String(body.tracking_number);
    }
    if (body.carrier !== undefined) {
      updates.carrier = body.carrier === null || body.carrier === "" ? null : String(body.carrier);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select("id, status, tracking_number, carrier, updated_at")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH admin/orders", error), { status: 500 });
    }
    if (!order) {
      return NextResponse.json(createError("E3002"), { status: 404 });
    }

    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/orders/[orderId]", e), { status: 500 });
  }
}
