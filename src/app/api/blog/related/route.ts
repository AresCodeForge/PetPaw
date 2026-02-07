import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RelatedPost = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
};

/**
 * GET /api/blog/related?postId=xxx&limit=3
 * Returns related posts based on category, excluding the current post
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "3", 10), 1), 10);

    if (!postId) {
      return NextResponse.json(
        createError("E2001"),
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // First, get the current post to find its category
    const { data: currentPost, error: postError } = await supabase
      .from("blog_posts")
      .select("id, category_id")
      .eq("id", postId)
      .single();

    if (postError || !currentPost) {
      return NextResponse.json(
        createError("E3008"),
        { status: 404 }
      );
    }

    const relatedPosts: RelatedPost[] = [];
    const excludeIds = [postId];

    // Try to get posts from the same category first
    if (currentPost.category_id) {
      const { data: categoryPosts, error: categoryError } = await supabase
        .from("blog_posts")
        .select("id, slug, title_en, title_el, excerpt_en, excerpt_el, featured_image, published_at")
        .eq("status", "published")
        .eq("category_id", currentPost.category_id)
        .neq("id", postId)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (!categoryError && categoryPosts) {
        for (const post of categoryPosts) {
          relatedPosts.push(post);
          excludeIds.push(post.id);
        }
      }
    }

    // If we need more posts, get recent ones from other categories
    if (relatedPosts.length < limit) {
      const remaining = limit - relatedPosts.length;
      
      const { data: recentPosts, error: recentError } = await supabase
        .from("blog_posts")
        .select("id, slug, title_en, title_el, excerpt_en, excerpt_el, featured_image, published_at")
        .eq("status", "published")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("published_at", { ascending: false })
        .limit(remaining);

      if (!recentError && recentPosts) {
        for (const post of recentPosts) {
          relatedPosts.push(post);
        }
      }
    }

    return NextResponse.json({ posts: relatedPosts });
  } catch (e) {
    return NextResponse.json(
      logAndCreateError("E9001", "GET /api/blog/related", e),
      { status: 500 }
    );
  }
}
