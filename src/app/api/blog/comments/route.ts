import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export type BlogComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * GET /api/blog/comments?postId=xxx
 * Returns approved comments for a blog post
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(createError("E2001", "postId is required"), { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch comments
    const { data: comments, error } = await supabase
      .from("blog_comments")
      .select("id, post_id, user_id, parent_id, content, status, created_at, updated_at")
      .eq("post_id", postId)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/blog/comments", error), { status: 500 });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    // Get unique user IDs and fetch their profiles
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    // Create a map of user_id -> profile
    const profileMap: Record<string, { id: string; name: string | null; avatar_url: string | null }> = {};
    for (const p of profiles ?? []) {
      profileMap[p.id] = p;
    }

    // Combine comments with profiles
    const transformedComments: BlogComment[] = comments.map((c) => ({
      ...c,
      profile: profileMap[c.user_id] || null,
    }));

    return NextResponse.json({ comments: transformedComments });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/blog/comments", e), { status: 500 });
  }
}

/**
 * POST /api/blog/comments
 * Create a new comment (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { postId, content, parentId } = body;

    // Validate required fields
    if (!postId) {
      return NextResponse.json(createError("E2001", "postId is required"), { status: 400 });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(createError("E2001", "content is required"), { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json(createError("E2001", "content exceeds maximum length of 2000 characters"), { status: 400 });
    }

    // Verify the post exists and is published
    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("id", postId)
      .eq("status", "published")
      .single();

    if (postError || !post) {
      return NextResponse.json(createError("E4001", "Post not found"), { status: 404 });
    }

    // If parentId is provided, verify it exists and belongs to the same post
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from("blog_comments")
        .select("id, post_id")
        .eq("id", parentId)
        .eq("post_id", postId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(createError("E4001", "Parent comment not found"), { status: 404 });
      }
    }

    // Insert the comment
    const { data: newComment, error: insertError } = await supabase
      .from("blog_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
        status: "approved", // Auto-approve for now
      })
      .select("id, post_id, user_id, parent_id, content, status, created_at, updated_at")
      .single();

    if (insertError) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/blog/comments", insertError), { status: 500 });
    }

    // Fetch the user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", user.id)
      .single();

    const transformedComment: BlogComment = {
      ...newComment,
      profile: profile || null,
    };

    return NextResponse.json({ comment: transformedComment }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/blog/comments", e), { status: 500 });
  }
}
