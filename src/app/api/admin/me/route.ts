import { NextResponse } from "next/server";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ admin: false });
    }
    return NextResponse.json({ admin: isAdmin(user) });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
