import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// POST /api/reports - Submit a report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { reported_user_id, content_type, content_id, reason, description } = body;

    if (!reported_user_id || !content_type || !reason) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const validTypes = ["chat_message", "dm_message", "profile", "image"];
    if (!validTypes.includes(content_type)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    if (reported_user_id === user.id) {
      return NextResponse.json(createError("E4017"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: report, error } = await admin
      .from("reported_content")
      .insert({
        reporter_id: user.id,
        reported_user_id,
        content_type,
        content_id: content_id || null,
        reason,
        description: description || null,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/reports", error), { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/reports", e), { status: 500 });
  }
}

// GET /api/reports - Get user's own reports
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const { data: reports, error } = await admin
      .from("reported_content")
      .select("id, content_type, reason, status, created_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/reports", error), { status: 500 });
    }

    return NextResponse.json({ reports: reports ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/reports", e), { status: 500 });
  }
}
