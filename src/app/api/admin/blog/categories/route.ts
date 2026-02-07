import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export type BlogCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  description_en: string | null;
  description_el: string | null;
  sort_order: number;
  created_at: string;
};

// GET /api/admin/blog/categories - List all categories (admin)
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
    const { data: categories, error } = await admin
      .from("blog_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/blog/categories", error), { status: 500 });
    }

    return NextResponse.json({ categories: categories ?? [] });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/blog/categories", e), { status: 500 });
  }
}

// POST /api/admin/blog/categories - Create a new category
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

    const body = await request.json();
    const { slug, name_en, name_el, description_en, description_el, sort_order } = body;

    // Validate required fields
    if (!slug || !name_en || !name_el) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Check for duplicate slug
    const { data: existing } = await admin
      .from("blog_categories")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: "E2002", code: "E2002", message: "Slug already exists" }, { status: 400 });
    }

    const { data: category, error } = await admin
      .from("blog_categories")
      .insert({
        slug,
        name_en,
        name_el,
        description_en: description_en || null,
        description_el: description_el || null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/admin/blog/categories", error), { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/admin/blog/categories", e), { status: 500 });
  }
}

// DELETE /api/admin/blog/categories - Delete a category (by id in body)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Check if category exists
    const { data: existing } = await admin
      .from("blog_categories")
      .select("id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(createError("E3009"), { status: 404 });
    }

    // Delete category (posts will have category_id set to null due to ON DELETE SET NULL)
    const { error } = await admin
      .from("blog_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/blog/categories", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/blog/categories", e), { status: 500 });
  }
}
