import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/user/public-key - Get user's public key
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .select("public_key")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(createError("E3002"), { status: 404 });
    }

    return NextResponse.json({ public_key: profile.public_key });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/user/public-key", e), { status: 500 });
  }
}

// POST /api/user/public-key - Store user's public key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { public_key } = body;

    if (!public_key) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("profiles")
      .update({ public_key })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "POST /api/user/public-key", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/user/public-key", e), { status: 500 });
  }
}
