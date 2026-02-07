import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export type BlogPostRow = {
  id: string;
  author_id: string;
  category_id: string | null;
  slug: string;
  title_en: string;
  title_el: string;
  content_en: string;
  content_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  meta_description_en: string | null;
  meta_description_el: string | null;
  writer_name: string | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    slug: string;
    name_en: string;
    name_el: string;
  } | null;
};

// GET /api/admin/blog/posts - List all posts (admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status"); // optional filter
    const offset = (page - 1) * limit;

    const admin = createSupabaseAdminClient();
    
    let query = admin
      .from("blog_posts")
      .select(`
        *,
        category:blog_categories(id, slug, name_en, name_el)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["draft", "published", "archived"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: posts, count, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/admin/blog/posts", error), { status: 500 });
    }

    return NextResponse.json({
      posts: posts ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/blog/posts", e), { status: 500 });
  }
}

// POST /api/admin/blog/posts - Create a new post
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
    const {
      slug,
      title_en,
      title_el,
      content_en,
      content_el,
      excerpt_en,
      excerpt_el,
      featured_image,
      meta_description_en,
      meta_description_el,
      category_id,
      status,
      published_at,
      writer_name,
    } = body;

    // Validate required fields
    if (!slug || !title_en || !title_el) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Validate slug format (lowercase, hyphens, no spaces)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Check for duplicate slug
    const { data: existing } = await admin
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: "E2002", code: "E2002", message: "Slug already exists" }, { status: 400 });
    }

    const postData = {
      author_id: user.id,
      slug,
      title_en,
      title_el,
      content_en: content_en || "",
      content_el: content_el || "",
      excerpt_en: excerpt_en || null,
      excerpt_el: excerpt_el || null,
      featured_image: featured_image || null,
      meta_description_en: meta_description_en || null,
      meta_description_el: meta_description_el || null,
      category_id: category_id || null,
      writer_name: writer_name || null,
      status: status || "draft",
      published_at: status === "published" ? (published_at || new Date().toISOString()) : null,
    };

    const { data: post, error } = await admin
      .from("blog_posts")
      .insert(postData)
      .select(`
        *,
        category:blog_categories(id, slug, name_en, name_el)
      `)
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/admin/blog/posts", error), { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/admin/blog/posts", e), { status: 500 });
  }
}
