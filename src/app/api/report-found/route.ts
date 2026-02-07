import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidPhone } from "@/lib/validation";
import { ERROR_CODES, logAndCreateError, createError } from "@/lib/errors";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
      return NextResponse.json(
        createError("E4003"),
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const petId = body?.pet_id;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!petId || !phone) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(createError("E2005"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: pet, error: petError } = await admin
      .from("pets")
      .select("id, owner_id, is_lost")
      .eq("id", petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(createError("E3001"), { status: 404 });
    }

    if (!pet.is_lost) {
      return NextResponse.json(createError("E4001"), { status: 400 });
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("tier")
      .eq("id", pet.owner_id)
      .maybeSingle();

    if (ownerProfile?.tier !== "pro") {
      return NextResponse.json(createError("E4002"), { status: 403 });
    }

    const { error: insertError } = await admin.from("lost_found_reports").insert({
      pet_id: petId,
      reporter_phone: phone,
    });

    if (insertError) {
      return NextResponse.json(logAndCreateError("E5002", "report-found insert", insertError), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "report-found", e), { status: 500 });
  }
}
