import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await client.auth.getUser();
    if (!error && user) return user.id;
  }
  const server = await createSupabaseServerClient();
  const { data: { user }, error } = await server.auth.getUser();
  return !error && user ? user.id : null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    if (!reportId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: report, error: reportError } = await admin
      .from("lost_found_reports")
      .select("id, pet_id")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(createError("E3001"), { status: 404 });
    }

    const { data: pet } = await admin
      .from("pets")
      .select("owner_id")
      .eq("id", report.pet_id)
      .single();

    if (!pet || pet.owner_id !== userId) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { error: deleteError } = await admin
      .from("lost_found_reports")
      .delete()
      .eq("id", reportId);

    if (deleteError) {
      return NextResponse.json(logAndCreateError("E5004", "delete report", deleteError), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "delete report", e), { status: 500 });
  }
}
