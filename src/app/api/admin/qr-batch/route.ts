import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { customAlphabet } from "nanoid";
import { logAndCreateError, createError } from "@/lib/errors";

const nanoid8 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 500);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (request.nextUrl.origin || request.headers.get("x-forwarded-host") ? `https://${request.headers.get("x-forwarded-host") || request.nextUrl.host}` : "http://localhost:3000");

    const admin = createSupabaseAdminClient();
    const shortCodes: string[] = [];
    const rows: { short_code: string; qr_code_data: string; pet_id: null }[] = [];

    for (let i = 0; i < count; i++) {
      const shortCode = nanoid8();
      shortCodes.push(shortCode);
      rows.push({
        short_code: shortCode,
        qr_code_data: `${baseUrl.replace(/\/$/, "")}/r/${shortCode}`,
        pet_id: null,
      });
    }

    const { error } = await admin.from("qr_codes").insert(rows);
    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "qr-batch insert", error), { status: 500 });
    }

    return NextResponse.json({ short_codes: shortCodes });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "qr-batch", e), { status: 500 });
  }
}
