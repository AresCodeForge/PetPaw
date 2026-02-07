import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/adoptions/[id] - Get single listing
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const admin = createSupabaseAdminClient();

    const { data: listing, error } = await admin
      .from("adoption_listings")
      .select(`
        *,
        images:adoption_images(id, image_url, display_order)
      `)
      .eq("id", id)
      .single();

    if (error || !listing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    // Check visibility - only approved listings are public
    // Unless the viewer is the owner or an admin
    if (!listing.is_approved) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || (user.id !== listing.user_id && !isAdmin(user))) {
        return NextResponse.json(createError("E3010"), { status: 404 });
      }
    }

    // Fetch user profile
    const { data: userProfile } = await admin
      .from("profiles")
      .select("id, name, avatar_url, is_shelter, shelter_name, shelter_verified_at")
      .eq("id", listing.user_id)
      .single();

    // Sort images by display_order
    const sortedListing = {
      ...listing,
      images: listing.images?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) ?? [],
      user: userProfile || null,
    };

    return NextResponse.json({ listing: sortedListing });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/adoptions/[id]", e), { status: 500 });
  }
}

// PUT /api/adoptions/[id] - Update own listing
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    // Check ownership
    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("adoption_listings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    // Allow owner or admin
    if (existing.user_id !== user.id && !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      pet_name,
      species,
      breed,
      age_years,
      age_months,
      gender,
      size,
      location_city,
      location_country,
      story,
      status,
      is_approved, // Admin only
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (pet_name !== undefined) updateData.pet_name = pet_name;
    if (species !== undefined) {
      if (!["dog", "cat", "other"].includes(species)) {
        return NextResponse.json(createError("E2002"), { status: 400 });
      }
      updateData.species = species;
    }
    if (breed !== undefined) updateData.breed = breed || null;
    if (age_years !== undefined) updateData.age_years = age_years;
    if (age_months !== undefined) updateData.age_months = age_months;
    if (gender !== undefined) updateData.gender = gender || null;
    if (size !== undefined) updateData.size = size || null;
    if (location_city !== undefined) updateData.location_city = location_city || null;
    if (location_country !== undefined) updateData.location_country = location_country || null;
    if (story !== undefined) updateData.story = story || null;
    if (status !== undefined) {
      if (!["available", "pending", "adopted"].includes(status)) {
        return NextResponse.json(createError("E2002"), { status: 400 });
      }
      updateData.status = status;
    }
    
    // Only admins can set is_approved
    if (is_approved !== undefined && isAdmin(user)) {
      updateData.is_approved = is_approved;
    }

    const { data: listing, error } = await admin
      .from("adoption_listings")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        images:adoption_images(id, image_url, display_order)
      `)
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5003", "PUT /api/adoptions/[id]", error), { status: 500 });
    }

    // Fetch user profile
    const { data: userProfile } = await admin
      .from("profiles")
      .select("id, name, avatar_url, is_shelter, shelter_name")
      .eq("id", listing.user_id)
      .single();

    return NextResponse.json({ listing: { ...listing, user: userProfile || null } });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "PUT /api/adoptions/[id]", e), { status: 500 });
  }
}

// DELETE /api/adoptions/[id] - Delete own listing
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    
    // Check ownership
    const { data: existing } = await admin
      .from("adoption_listings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    // Allow owner or admin
    if (existing.user_id !== user.id && !isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    const { error } = await admin
      .from("adoption_listings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/adoptions/[id]", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/adoptions/[id]", e), { status: 500 });
  }
}
