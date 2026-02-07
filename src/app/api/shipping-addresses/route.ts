import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeName, sanitizeAddressLine, sanitizePostalCode, isValidPhone } from "@/lib/validation";
import { logAndCreateError, createError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { data: addresses, error } = await supabase
      .from("shipping_addresses")
      .select("id, full_name, address_line1, address_line2, city, state, postal_code, country, phone, created_at")
      .eq("user_id", user.id)
      .eq("saved_for_reuse", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/shipping-addresses", error), { status: 500 });
    }

    return NextResponse.json({ addresses: addresses ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/shipping-addresses", e), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { full_name, address_line1, address_line2, city, state, postal_code, country, phone } = body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      typeof address_line1 !== "string" ||
      !address_line1.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof postal_code !== "string" ||
      !postal_code.trim() ||
      typeof country !== "string" ||
      !country.trim() ||
      typeof phone !== "string" ||
      !phone.trim()
    ) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json(createError("E2005"), { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from("shipping_addresses")
      .insert({
        user_id: user.id,
        saved_for_reuse: true,
        full_name: sanitizeName(full_name),
        address_line1: sanitizeAddressLine(address_line1),
        address_line2: sanitizeAddressLine(address_line2 ?? "") || null,
        city: sanitizeAddressLine(city),
        state: sanitizeAddressLine(state ?? "") || null,
        postal_code: sanitizePostalCode(postal_code),
        country: sanitizeAddressLine(country),
        phone: phone.trim().replace(/\s+/g, " ").slice(0, 30),
      })
      .select("id, full_name, address_line1, address_line2, city, state, postal_code, country, phone, created_at")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/shipping-addresses", error), { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/shipping-addresses", e), { status: 500 });
  }
}
