import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/favorites/[id] - Remove from favorites
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const { error } = await supabase
      .from("adoption_favorites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/favorites/[id]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/favorites/[id]", e), { status: 500 });
  }
}
