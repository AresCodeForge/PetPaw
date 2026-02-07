import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteParams = {
  params: Promise<{ commentId: string }>;
};

/**
 * PATCH /api/admin/comments/[commentId]
 * Update comment status (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const supabase = await createSupabaseServerClient();

    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002", "Admin access required"), { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["pending", "approved", "spam", "deleted"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(createError("E2001", "Invalid status"), { status: 400 });
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("blog_comments")
      .update({ status })
      .eq("id", commentId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/admin/comments", updateError), { status: 500 });
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/comments", e), { status: 500 });
  }
}

/**
 * DELETE /api/admin/comments/[commentId]
 * Delete a comment (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const supabase = await createSupabaseServerClient();

    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002", "Admin access required"), { status: 403 });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from("blog_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/comments", deleteError), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/comments", e), { status: 500 });
  }
}
