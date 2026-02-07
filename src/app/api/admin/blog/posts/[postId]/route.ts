import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ postId: string }> };

// GET /api/admin/blog/posts/[postId] - Get single post
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: post, error } = await admin
      .from("blog_posts")
      .select(`
        *,
        category:blog_categories(id, slug, name_en, name_el)
      `)
      .eq("id", postId)
      .single();

    if (error || !post) {
      return NextResponse.json(createError("E3008"), { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/blog/posts/[postId]", e), { status: 500 });
  }
}

// PATCH /api/admin/blog/posts/[postId] - Update post
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    
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

    const admin = createSupabaseAdminClient();

    // Check if post exists
    const { data: existing } = await admin
      .from("blog_posts")
      .select("id, slug, status")
      .eq("id", postId)
      .single();

    if (!existing) {
      return NextResponse.json(createError("E3008"), { status: 404 });
    }

    // If slug is being changed, check for duplicates
    if (slug && slug !== existing.slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(createError("E2002"), { status: 400 });
      }
      
      const { data: slugExists } = await admin
        .from("blog_posts")
        .select("id")
        .eq("slug", slug)
        .neq("id", postId)
        .single();

      if (slugExists) {
        return NextResponse.json({ error: "E2002", code: "E2002", message: "Slug already exists" }, { status: 400 });
      }
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (slug !== undefined) updateData.slug = slug;
    if (title_en !== undefined) updateData.title_en = title_en;
    if (title_el !== undefined) updateData.title_el = title_el;
    if (content_en !== undefined) updateData.content_en = content_en;
    if (content_el !== undefined) updateData.content_el = content_el;
    if (excerpt_en !== undefined) updateData.excerpt_en = excerpt_en;
    if (excerpt_el !== undefined) updateData.excerpt_el = excerpt_el;
    if (featured_image !== undefined) updateData.featured_image = featured_image;
    if (meta_description_en !== undefined) updateData.meta_description_en = meta_description_en;
    if (meta_description_el !== undefined) updateData.meta_description_el = meta_description_el;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (writer_name !== undefined) updateData.writer_name = writer_name;
    if (status !== undefined) {
      updateData.status = status;
      // Set published_at when publishing for the first time
      if (status === "published" && existing.status !== "published") {
        updateData.published_at = published_at || new Date().toISOString();
      }
    }
    if (published_at !== undefined && status === "published") {
      updateData.published_at = published_at;
    }

    const { data: post, error } = await admin
      .from("blog_posts")
      .update(updateData)
      .eq("id", postId)
      .select(`
        *,
        category:blog_categories(id, slug, name_en, name_el)
      `)
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PATCH /api/admin/blog/posts/[postId]", error), { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PATCH /api/admin/blog/posts/[postId]", e), { status: 500 });
  }
}

// DELETE /api/admin/blog/posts/[postId] - Delete post
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    // Check if post exists
    const { data: existing } = await admin
      .from("blog_posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (!existing) {
      return NextResponse.json(createError("E3008"), { status: 404 });
    }

    const { error } = await admin
      .from("blog_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/admin/blog/posts/[postId]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/admin/blog/posts/[postId]", e), { status: 500 });
  }
}
