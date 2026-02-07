import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// Helper to safely nullify a column (set to null where it references the user)
async function safeNullify(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  table: string,
  column: string,
  userId: string
) {
  try {
    const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
    if (error && !error.message.includes("does not exist")) {
      console.log(`[Nullify] ${table}.${column}: ${error.message}`);
    }
  } catch (e) {
    // Table might not exist - that's fine
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(createError("E3001"), { status: 400 });
    }

    // Verify admin
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    console.log(`[Admin] Starting deletion of user: ${userId}`);

    // ============================================
    // STEP 1: Nullify "action by" references 
    // These columns use ON DELETE SET NULL, but we do it manually first
    // to ensure clean state before cascade deletion
    // ============================================
    await safeNullify(admin, "chat_bans", "banned_by", userId);
    await safeNullify(admin, "chat_messages", "deleted_by", userId);
    await safeNullify(admin, "shelter_applications", "reviewed_by", userId);
    await safeNullify(admin, "moderation_log", "reviewed_by", userId);
    await safeNullify(admin, "reported_content", "resolved_by", userId);
    await safeNullify(admin, "blog_posts", "author_id", userId);

    // ============================================
    // STEP 2: Delete the auth user
    // All tables with ON DELETE CASCADE will be cleaned automatically:
    // - profiles, pets, pet_images, vaccinations, pet_journal_entries
    // - orders, order_items, shipping_addresses
    // - blog_comments, adoption_listings, adoption_favorites
    // - conversations, messages, dm_conversations, dm_messages
    // - chat_messages, chat_presence, chat_bans, chat_reactions, chat_last_read
    // - moderation_log, reported_content, shelter_applications
    // ============================================
    console.log(`[Admin] Deleting auth user: ${userId}`);
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error("[Admin] Error deleting auth user:", authDeleteError.message);
      console.error("[Admin] Full error:", JSON.stringify(authDeleteError, null, 2));
      
      return NextResponse.json(
        { 
          error: "Failed to delete user", 
          details: authDeleteError.message
        },
        { status: 500 }
      );
    }

    console.log(`[Admin] Successfully deleted user: ${userId}`);
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (e) {
    console.error("[Admin] Error in DELETE /api/admin/users/[userId]:", e);
    return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/users/[userId]", e), { status: 500 });
  }
}
