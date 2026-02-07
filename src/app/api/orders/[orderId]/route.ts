import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

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

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
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
      .eq("user_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(createError("E3002"), { status: 404 });
    }

    const [itemsRes, addressRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("id, product_id, quantity, price_per_item, products ( name )")
        .eq("order_id", orderId),
      supabase
        .from("shipping_addresses")
        .select("id, full_name, address_line1, address_line2, city, state, postal_code, country, phone")
        .eq("id", order.shipping_address_id)
        .single(),
    ]);

    if (itemsRes.error) {
      return NextResponse.json(logAndCreateError("E5001", "GET order items", itemsRes.error), { status: 500 });
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
    return NextResponse.json(logAndCreateError("E9001", "GET /api/orders/[orderId]", e), { status: 500 });
  }
}
