import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Server-side Supabase client using cookies (for auth in API routes). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

/** Service role client (bypasses RLS). Use only in admin API routes after checking isAdmin. */
export function createSupabaseAdminClient() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export function isAdmin(user: { id: string; email?: string | null } | null): boolean {
  if (!user) return false;
  const adminIds = process.env.ADMIN_USER_IDS?.split(",").map((s) => s.trim()).filter(Boolean);
  const adminEmails = process.env.ADMIN_EMAIL?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (adminIds?.includes(user.id)) return true;
  if (user.email && adminEmails?.includes(user.email.toLowerCase())) return true;
  return false;
}
