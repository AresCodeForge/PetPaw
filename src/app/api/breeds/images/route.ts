import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch custom breed images (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const breedId = searchParams.get("breed_id");

    let query = supabaseAdmin
      .from("breed_images")
      .select("*")
      .order("breed_id")
      .order("display_order");

    if (breedId) {
      query = query.eq("breed_id", breedId);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error("Error fetching breed images:", error);
      return NextResponse.json({ images: [] });
    }

    return NextResponse.json({ images: images || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ images: [] });
  }
}
