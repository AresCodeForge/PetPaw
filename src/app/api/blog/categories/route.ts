import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError } from "@/lib/errors";

// GET /api/blog/categories - List all categories (public)
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: categories, error } = await supabase
      .from("blog_categories")
      .select("id, slug, name_en, name_el, description_en, description_el")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/blog/categories", error), { status: 500 });
    }

    return NextResponse.json({ categories: categories ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/blog/categories", e), { status: 500 });
  }
}
