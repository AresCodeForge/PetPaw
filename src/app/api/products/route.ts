import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, description, price, price_cents, image_url")
      .order("name");

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/products", error), { status: 500 });
    }

    return NextResponse.json({
      products: (products ?? []).map((p: { id: string; name: string; description: string | null; price?: number; price_cents?: number | null; image_url: string | null }) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        price: p.price_cents != null ? p.price_cents / 100 : Number(p.price ?? 0),
        image_url: p.image_url ?? null,
      })),
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/products", e), { status: 500 });
  }
}
