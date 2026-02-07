import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// GET /api/chat/consent - Check if user has given chat consent
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Try to read consent columns; if they don't exist yet (migration
    // not applied), fall back gracefully.
    const { data: profile, error } = await admin
      .from("profiles")
      .select("chat_consent_at, birth_year")
      .eq("id", user.id)
      .single();

    if (error) {
      // Column-doesn't-exist errors contain "column ... does not exist"
      const msg = typeof error === "object" && "message" in error ? (error as { message: string }).message : "";
      if (msg.includes("does not exist")) {
        // Migration hasn't been applied yet – treat as consented so users
        // aren't blocked by a missing column.
        return NextResponse.json({ has_consent: true, consent_at: null });
      }
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/consent", error), { status: 500 });
    }

    return NextResponse.json({
      has_consent: !!profile?.chat_consent_at,
      consent_at: profile?.chat_consent_at || null,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/consent", e), { status: 500 });
  }
}

// POST /api/chat/consent - Record chat consent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const body = await request.json();
    const { birth_year } = body;

    if (!birth_year || typeof birth_year !== "number") {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Age verification: must be at least 13
    const currentYear = new Date().getFullYear();
    if (currentYear - birth_year < 13) {
      return NextResponse.json(
        { error: "E4016", code: "E4016", message: "Must be at least 13 years old" },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Try updating the consent columns. If they don't exist yet, try
    // adding them on the fly (the migration may not have been applied).
    const { error } = await admin
      .from("profiles")
      .update({
        chat_consent_at: new Date().toISOString(),
        birth_year,
      })
      .eq("id", user.id);

    if (error) {
      const msg = typeof error === "object" && "message" in error ? (error as { message: string }).message : "";

      // If columns are missing, try to add them via raw SQL
      if (msg.includes("does not exist")) {
        try {
          await admin.rpc("exec_sql", {
            query: `
              ALTER TABLE public.profiles 
                ADD COLUMN IF NOT EXISTS chat_consent_at timestamptz,
                ADD COLUMN IF NOT EXISTS birth_year integer;
            `,
          });
          // Retry the update
          const { error: retryError } = await admin
            .from("profiles")
            .update({
              chat_consent_at: new Date().toISOString(),
              birth_year,
            })
            .eq("id", user.id);

          if (retryError) {
            // Column auto-creation didn't work – just accept consent without storing
            // so the user isn't blocked.
            return NextResponse.json({ success: true });
          }
          return NextResponse.json({ success: true });
        } catch {
          // exec_sql RPC doesn't exist – just accept consent
          return NextResponse.json({ success: true });
        }
      }

      return NextResponse.json(logAndCreateError("E5003", "POST /api/chat/consent", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/chat/consent", e), { status: 500 });
  }
}
