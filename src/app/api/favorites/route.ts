import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/favorites - Get user's favorites
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { data: favorites, error } = await supabase
      .from("adoption_favorites")
      .select(`
        id,
        listing_id,
        created_at,
        listing:adoption_listings(
          id,
          title,
          pet_name,
          species,
          breed,
          status,
          is_approved,
          images:adoption_images(id, image_url, display_order),
          user:profiles!adoption_listings_user_id_profiles_fkey(id, name, avatar_url, is_shelter, shelter_name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/favorites", error), { status: 500 });
    }

    return NextResponse.json({ favorites: favorites ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/favorites", e), { status: 500 });
  }
}

// POST /api/favorites - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { listing_id } = body;

    if (!listing_id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Check if listing exists
    const { data: listing } = await supabase
      .from("adoption_listings")
      .select("id")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from("adoption_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing_id)
      .single();

    if (existing) {
      return NextResponse.json(createError("E4006"), { status: 400 });
    }

    const { data: favorite, error } = await supabase
      .from("adoption_favorites")
      .insert({
        user_id: user.id,
        listing_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/favorites", error), { status: 500 });
    }

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/favorites", e), { status: 500 });
  }
}
