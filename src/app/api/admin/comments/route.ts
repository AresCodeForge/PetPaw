import { NextResponse } from "next/server";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

/**
 * GET /api/admin/comments
 * Returns all comments with post and user info (admin only)
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002", "Admin access required"), { status: 403 });
    }

    // Fetch all comments
    const { data: comments, error } = await supabase
      .from("blog_comments")
      .select("id, post_id, user_id, content, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/comments", error), { status: 500 });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    // Get unique post and user IDs
    const postIds = [...new Set(comments.map((c) => c.post_id))];
    const userIds = [...new Set(comments.map((c) => c.user_id))];

    // Fetch posts and profiles
    const [postsResult, profilesResult] = await Promise.all([
      supabase.from("blog_posts").select("id, title_en, title_el").in("id", postIds),
      supabase.from("profiles").select("id, name, email").in("id", userIds),
    ]);

    // Create lookup maps
    const postMap: Record<string, { title_en: string; title_el: string }> = {};
    for (const p of postsResult.data ?? []) {
      postMap[p.id] = { title_en: p.title_en, title_el: p.title_el };
    }

    const userMap: Record<string, { name: string | null; email: string | null }> = {};
    for (const u of profilesResult.data ?? []) {
      userMap[u.id] = { name: u.name, email: u.email };
    }

    // Enrich comments with post and user info
    const enrichedComments = comments.map((c) => ({
      ...c,
      post_title: postMap[c.post_id]?.title_en || "Unknown Post",
      user_name: userMap[c.user_id]?.name || null,
      user_email: userMap[c.user_id]?.email || null,
    }));

    return NextResponse.json({ comments: enrichedComments });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/comments", e), { status: 500 });
  }
}
