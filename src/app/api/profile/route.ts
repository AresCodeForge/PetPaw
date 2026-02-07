import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeName, sanitizeEmail, isValidEmail } from "@/lib/validation";
import { ERROR_CODES, logAndCreateError, createError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url, tier")
      .eq("id", user.id)
      .maybeSingle();
    
    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/profile", error), { status: 500 });
    }
    const authEmail = user.email ?? null;
    if (profile && profile.email !== authEmail) {
      await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id);
    }
    const tier = profile?.tier === "pro" ? "pro" : "free";
    
    const payload = profile
      ? { ...profile, tier, email: authEmail ?? profile.email }
      : { id: user.id, name: null, email: authEmail, avatar_url: null, tier: "free" as const };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/profile", e), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    // Do not accept or persist tier; only admin/service role can change it.
    const updates: { name?: string; email?: string } = {};
    if (typeof body.name === "string") {
      const name = sanitizeName(body.name);
      updates.name = name || null;
    }
    if (typeof body.email === "string") {
      const email = sanitizeEmail(body.email);
      if (email && !isValidEmail(email)) {
        return NextResponse.json(createError("E2004"), { status: 400 });
      }
      updates.email = email || null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates }, { onConflict: "id" })
      .select()
      .single();
    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/profile", error), { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/profile", e), { status: 500 });
  }
}
