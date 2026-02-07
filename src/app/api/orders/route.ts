import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { customAlphabet } from "nanoid";
import { sanitizeName, sanitizeAddressLine, sanitizePostalCode, isValidPhone } from "@/lib/validation";
import { logAndCreateError, createError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, total_cents, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/orders", error), { status: 500 });
    }

    return NextResponse.json({
      orders: (orders ?? []).map((o: { id: string; order_number?: string | null; status: string; payment_status: string; total_amount?: number; total_cents?: number | null; created_at: string }) => ({
        id: o.id,
        order_number: o.order_number ?? o.id.slice(0, 8),
        status: o.status,
        payment_status: o.payment_status,
        total_amount: o.total_cents != null ? o.total_cents / 100 : Number(o.total_amount ?? 0),
        created_at: o.created_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/orders", e), { status: 500 });
  }
}

const nanoid8 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

const MAX_QUANTITY_PER_ITEM = 20;
const MAX_ITEMS = 5;

type ShippingAddressInput = {
  full_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  phone: string;
};

function isValidAddress(a: unknown): a is ShippingAddressInput {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.full_name === "string" &&
    o.full_name.trim().length > 0 &&
    typeof o.address_line1 === "string" &&
    o.address_line1.trim().length > 0 &&
    typeof o.city === "string" &&
    o.city.trim().length > 0 &&
    typeof o.postal_code === "string" &&
    o.postal_code.trim().length > 0 &&
    typeof o.country === "string" &&
    o.country.trim().length > 0 &&
    typeof o.phone === "string" &&
    o.phone.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { items: itemsInput, shipping_address_id: addressId, shipping_address: addressInput, save_address: saveAddress } = body as {
      items?: Array<{ product_id: string; quantity: number }>;
      shipping_address_id?: string;
      shipping_address?: unknown;
      save_address?: boolean;
    };

    if (!Array.isArray(itemsInput) || itemsInput.length === 0 || itemsInput.length > MAX_ITEMS) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (request.nextUrl.origin || (request.headers.get("x-forwarded-host") ? `https://${request.headers.get("x-forwarded-host")}` : "http://localhost:3000"));

    let shippingAddressId: string;

    if (addressId && typeof addressId === "string") {
      const { data: addr, error: addrErr } = await supabase
        .from("shipping_addresses")
        .select("id")
        .eq("id", addressId)
        .eq("user_id", user.id)
        .single();
      if (addrErr || !addr) {
        return NextResponse.json(createError("E3003"), { status: 400 });
      }
      shippingAddressId = addr.id;
    } else if (isValidAddress(addressInput)) {
      if (!isValidPhone(addressInput.phone)) {
        return NextResponse.json(createError("E2005"), { status: 400 });
      }
      const { data: inserted, error: insertErr } = await supabase
        .from("shipping_addresses")
        .insert({
          user_id: user.id,
          saved_for_reuse: saveAddress !== false,
          full_name: sanitizeName(addressInput.full_name),
          address_line1: sanitizeAddressLine(addressInput.address_line1),
          address_line2: sanitizeAddressLine(addressInput.address_line2 ?? "") || null,
          city: sanitizeAddressLine(addressInput.city),
          state: sanitizeAddressLine(addressInput.state ?? "") || null,
          postal_code: sanitizePostalCode(addressInput.postal_code),
          country: sanitizeAddressLine(addressInput.country),
          phone: addressInput.phone.trim().replace(/\s+/g, " ").slice(0, 30),
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        return NextResponse.json(logAndCreateError("E5002", "shipping_address insert", insertErr), { status: 500 });
      }
      shippingAddressId = inserted.id;
    } else {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const productIds = [...new Set(itemsInput.map((i) => i.product_id))];
    const { data: products, error: productsErr } = await supabase
      .from("products")
      .select("id, price, price_cents")
      .in("id", productIds);

    if (productsErr || !products?.length) {
      return NextResponse.json(createError("E3004"), { status: 400 });
    }

    const priceCentsByProductId = new Map(
      products.map((p: { id: string; price?: number; price_cents?: number | null }) => [
        p.id,
        p.price_cents != null ? p.price_cents : Math.round(Number(p.price ?? 0) * 100),
      ])
    );
    let totalCents = 0;
    const validatedItems: Array<{ product_id: string; quantity: number; price_per_item: number; unit_price_cents: number }> = [];

    for (const item of itemsInput) {
      const qty = Math.min(Math.max(Number(item.quantity) || 0, 1), MAX_QUANTITY_PER_ITEM);
      const unitCents = priceCentsByProductId.get(item.product_id);
      if (unitCents === undefined) {
        return NextResponse.json(createError("E3004"), { status: 400 });
      }
      const pricePerItem = unitCents / 100;
      validatedItems.push({ product_id: item.product_id, quantity: qty, price_per_item: pricePerItem, unit_price_cents: unitCents });
      totalCents += qty * unitCents;
    }

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const todayStart = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const admin = createSupabaseAdminClient();
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString());
    const seq = String((count ?? 0) + 1).padStart(2, "0");
    const orderNumber = `PP${dateStr}-${seq}`;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "payment_pending",
        payment_status: "pending",
        total_amount: totalCents / 100,
        total_cents: totalCents,
        currency: "eur",
        order_number: orderNumber,
        shipping_address_id: shippingAddressId,
      })
      .select("id, order_number, created_at")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(logAndCreateError("E5002", "orders insert", orderErr), { status: 500 });
    }

    const orderItemIds: string[] = [];

    for (const item of validatedItems) {
      const { data: orderItem, error: itemErr } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_item: item.price_per_item,
          unit_price_cents: item.unit_price_cents,
        })
        .select("id")
        .single();

      if (itemErr || !orderItem) {
        return NextResponse.json(logAndCreateError("E5002", "order_items insert", itemErr), { status: 500 });
      }
      orderItemIds.push(orderItem.id);

      const qrRows: Array<{ short_code: string; qr_code_data: string; pet_id: null; order_item_id: string }> = [];
      for (let i = 0; i < item.quantity; i++) {
        const shortCode = nanoid8();
        qrRows.push({
          short_code: shortCode,
          qr_code_data: `${baseUrl.replace(/\/$/, "")}/r/${shortCode}`,
          pet_id: null,
          order_item_id: orderItem.id,
        });
      }
      if (qrRows.length > 0) {
        const { error: qrErr } = await admin.from("qr_codes").insert(qrRows);
        if (qrErr) {
          return NextResponse.json(logAndCreateError("E5002", "qr_codes insert", qrErr), { status: 500 });
        }
      }
    }

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number ?? order.id.slice(0, 8),
      created_at: order.created_at,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/orders", e), { status: 500 });
  }
}
