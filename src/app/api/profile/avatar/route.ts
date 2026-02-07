import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ERROR_CODES, logAndCreateError, createError } from "@/lib/errors";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(createError("E6002"), { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(createError("E6003"), { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json(logAndCreateError("E6001", "avatar upload", uploadError), { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existing) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) {
        return NextResponse.json(logAndCreateError("E5003", "avatar profile update", updateError), { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, avatar_url: publicUrl });
      if (insertError) {
        return NextResponse.json(logAndCreateError("E5002", "avatar profile insert", insertError), { status: 500 });
      }
    }
    return NextResponse.json({ avatar_url: publicUrl });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/profile/avatar", e), { status: 500 });
  }
}
