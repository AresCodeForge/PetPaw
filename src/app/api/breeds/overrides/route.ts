import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch breed content overrides (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const breedId = searchParams.get("breed_id");

    if (!breedId) {
      return NextResponse.json({ overrides: {} });
    }

    const { data, error } = await supabaseAdmin
      .from("breed_overrides")
      .select("overrides")
      .eq("breed_id", breedId)
      .single();

    if (error) {
      // PGRST116 = no rows found — not an error, just no overrides
      if (error.code === "PGRST116") {
        return NextResponse.json({ overrides: {} });
      }
      console.error("Error fetching breed overrides:", error);
      return NextResponse.json({ overrides: {} });
    }

    return NextResponse.json({ overrides: data?.overrides || {} });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ overrides: {} });
  }
}
