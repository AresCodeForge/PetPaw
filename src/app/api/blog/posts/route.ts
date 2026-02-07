import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError } from "@/lib/errors";

// GET /api/blog/posts - List published posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const category = searchParams.get("category"); // optional category slug filter
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("blog_posts")
      .select(`
        id,
        slug,
        title_en,
        title_el,
        excerpt_en,
        excerpt_el,
        featured_image,
        published_at,
        writer_name,
        category:blog_categories(id, slug, name_en, name_el)
      `, { count: "exact" })
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by category if provided
    if (category) {
      // First get the category id
      const { data: categoryData } = await supabase
        .from("blog_categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (categoryData) {
        query = query.eq("category_id", categoryData.id);
      }
    }

    const { data: posts, count, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/blog/posts", error), { status: 500 });
    }

    return NextResponse.json({
      posts: posts ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/blog/posts", e), { status: 500 });
  }
}
