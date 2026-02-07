import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteParams = {
  params: Promise<{ commentId: string }>;
};

/**
 * PATCH /api/blog/comments/[commentId]
 * Update own comment (requires authentication)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    // Check if comment exists and belongs to user
    const { data: existingComment, error: fetchError } = await supabase
      .from("blog_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json(createError("E4001", "Comment not found"), { status: 404 });
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(createError("E1002", "Not authorized to edit this comment"), { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(createError("E2001", "content is required"), { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json(createError("E2001", "content exceeds maximum length of 2000 characters"), { status: 400 });
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("blog_comments")
      .update({ content: content.trim() })
      .eq("id", commentId)
      .select("id, post_id, user_id, parent_id, content, status, created_at, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/blog/comments", updateError), { status: 500 });
    }

    // Fetch the user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", user.id)
      .single();

    const transformedComment = {
      ...updatedComment,
      profile: profile || null,
    };

    return NextResponse.json({ comment: transformedComment });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/blog/comments", e), { status: 500 });
  }
}

/**
 * DELETE /api/blog/comments/[commentId]
 * Delete own comment (requires authentication)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    // Check if comment exists and belongs to user
    const { data: existingComment, error: fetchError } = await supabase
      .from("blog_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json(createError("E4001", "Comment not found"), { status: 404 });
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(createError("E1002", "Not authorized to delete this comment"), { status: 403 });
    }

    // Delete the comment (cascade will handle replies)
    const { error: deleteError } = await supabase
      .from("blog_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/blog/comments", deleteError), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/blog/comments", e), { status: 500 });
  }
}
