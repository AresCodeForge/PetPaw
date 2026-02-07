import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/chat/roles - List all available roles
export async function GET() {
  try {
    const admin = createSupabaseAdminClient();

    const { data: roles, error } = await admin
      .from("chat_roles")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/roles", error), { status: 500 });
    }

    return NextResponse.json({ roles: roles ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/roles", e), { status: 500 });
  }
}
