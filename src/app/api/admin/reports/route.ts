import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/admin/reports - List all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("reported_content")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: reports, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/reports", error), { status: 500 });
    }

    // Fetch profiles for reporters and reported users
    const userIds = new Set<string>();
    for (const r of reports ?? []) {
      userIds.add(r.reporter_id);
      userIds.add(r.reported_user_id);
      if (r.resolved_by) userIds.add(r.resolved_by);
    }

    let profilesMap = new Map();
    if (userIds.size > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, avatar_url, email")
        .in("id", Array.from(userIds));
      profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));
    }

    // Fetch message content for chat_message and dm_message types
    const enrichedReports = await Promise.all((reports ?? []).map(async (report) => {
      let contentPreview: string | null = null;

      if (report.content_id) {
        if (report.content_type === "chat_message") {
          const { data: msg } = await admin
            .from("chat_messages")
            .select("content")
            .eq("id", report.content_id)
            .single();
          contentPreview = msg?.content?.substring(0, 200) || null;
        } else if (report.content_type === "dm_message") {
          const { data: msg } = await admin
            .from("dm_messages")
            .select("content")
            .eq("id", report.content_id)
            .single();
          contentPreview = msg?.content?.substring(0, 200) || null;
        }
      }

      return {
        ...report,
        reporter: profilesMap.get(report.reporter_id) || null,
        reported_user: profilesMap.get(report.reported_user_id) || null,
        resolved_by_user: report.resolved_by ? profilesMap.get(report.resolved_by) || null : null,
        content_preview: contentPreview,
      };
    }));

    return NextResponse.json({ reports: enrichedReports });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/reports", e), { status: 500 });
  }
}
