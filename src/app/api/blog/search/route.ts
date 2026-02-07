import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type BlogPostResult = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
  category: {
    id: string;
    name_en: string;
    name_el: string;
  } | null;
};

/**
 * GET /api/blog/search?q=query&limit=10
 * Search published blog posts by title and content
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "10", 10), 1), 50);

    if (!query || query.length < 2) {
      return NextResponse.json(
        createError("E2001"),
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Escape special characters for ILIKE pattern
    const escapedQuery = query.replace(/[%_\\]/g, "\\$&");
    const pattern = `%${escapedQuery}%`;

    // Search in title and content (both languages)
    const { data: posts, error } = await supabase
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
        category_id
      `)
      .eq("status", "published")
      .or(
        `title_en.ilike.${pattern},title_el.ilike.${pattern},content_en.ilike.${pattern},content_el.ilike.${pattern}`
      )
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        logAndCreateError("E5001", "GET /api/blog/search", error),
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], query });
    }

    // Fetch categories for the posts
    const categoryIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))];
    let categoryMap: Record<string, { id: string; name_en: string; name_el: string }> = {};

    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from("blog_categories")
        .select("id, name_en, name_el")
        .in("id", categoryIds);

      if (categories) {
        for (const cat of categories) {
          categoryMap[cat.id] = cat;
        }
      }
    }

    // Transform results
    const results: BlogPostResult[] = posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title_en: p.title_en,
      title_el: p.title_el,
      excerpt_en: p.excerpt_en,
      excerpt_el: p.excerpt_el,
      featured_image: p.featured_image,
      published_at: p.published_at,
      category: p.category_id ? categoryMap[p.category_id] || null : null,
    }));

    return NextResponse.json({ posts: results, query });
  } catch (e) {
    return NextResponse.json(
      logAndCreateError("E9001", "GET /api/blog/search", e),
      { status: 500 }
    );
  }
}
