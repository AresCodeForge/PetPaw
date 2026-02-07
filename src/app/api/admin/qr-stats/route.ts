import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";
import { maskEmail } from "@/lib/privacy";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const { count: total } = await admin.from("qr_codes").select("id", { count: "exact", head: true });
    const { count: unclaimed } = await admin.from("qr_codes").select("id", { count: "exact", head: true }).is("pet_id", null);
    const { count: claimed } = await admin.from("qr_codes").select("id", { count: "exact", head: true }).not("pet_id", "is", null);
    const { count: unprinted } = await admin.from("qr_codes").select("id", { count: "exact", head: true }).is("printed_at", null);
    const { count: unprintedUnclaimed } = await admin
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .is("printed_at", null)
      .is("pet_id", null);

    const { data: recent } = await admin
      .from("qr_codes")
      .select("short_code, printed_at, pet_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const petIds = [...new Set((recent ?? []).map((r) => r.pet_id).filter(Boolean))] as string[];
    const { data: pets } = petIds.length
      ? await admin.from("pets").select("id, name, owner_id").in("id", petIds)
      : { data: [] };

    const petNames: Record<string, string> = {};
    const ownerIdByPetId: Record<string, string> = {};
    for (const p of pets ?? []) {
      petNames[p.id] = p.name;
      ownerIdByPetId[p.id] = (p as { owner_id: string }).owner_id;
    }

    const ownerIds = [...new Set(Object.values(ownerIdByPetId))];
    const emailsByOwnerId: Record<string, string> = {};
    for (const uid of ownerIds) {
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(uid);
        emailsByOwnerId[uid] = maskEmail(user?.email);
      } catch {
        const { data: pr } = await admin.from("profiles").select("email").eq("id", uid).single();
        emailsByOwnerId[uid] = maskEmail(pr?.email);
      }
    }

    const list = (recent ?? []).map((r) => {
      const ownerId = r.pet_id ? ownerIdByPetId[r.pet_id] : null;
      const owner_email = ownerId ? (emailsByOwnerId[ownerId] ?? "—") : null;
      return {
        short_code: r.short_code,
        created_at: r.created_at,
        printed_at: r.printed_at ?? null,
        claimed: !!r.pet_id,
        pet_name: r.pet_id ? (petNames[r.pet_id] ?? "—") : null,
        owner_email: owner_email ?? null,
      };
    });

    return NextResponse.json({
      total: total ?? 0,
      unclaimed: unclaimed ?? 0,
      claimed: claimed ?? 0,
      unprinted: unprinted ?? 0,
      unprinted_unclaimed: unprintedUnclaimed ?? 0,
      recent: list,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "qr-stats", e), { status: 500 });
  }
}
