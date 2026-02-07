import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

export type AdoptionListingRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  pet_name: string;
  species: "dog" | "cat" | "other";
  breed: string | null;
  age_years: number;
  age_months: number;
  gender: "male" | "female" | "unknown" | null;
  size: "small" | "medium" | "large" | null;
  location_city: string | null;
  location_country: string | null;
  story: string | null;
  status: "available" | "pending" | "adopted";
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  images?: { id: string; image_url: string; display_order: number }[];
  user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    is_shelter: boolean;
    shelter_name: string | null;
  };
};

// GET /api/adoptions - List approved adoption listings (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const species = searchParams.get("species");
    const breed = searchParams.get("breed");
    const size = searchParams.get("size");
    const gender = searchParams.get("gender");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const userId = searchParams.get("user_id"); // For my-listings
    const includeUnapproved = searchParams.get("include_unapproved") === "true";
    const offset = (page - 1) * limit;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("adoption_listings")
      .select(`
        *,
        images:adoption_images(id, image_url, display_order)
      `, { count: "exact" })
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // If fetching user's own listings, include unapproved
    let isOwnListings = false;
    if (userId) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        isOwnListings = true;
        query = admin
          .from("adoption_listings")
          .select(`
            *,
            images:adoption_images(id, image_url, display_order)
          `, { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
      }
    }
    
    if (!isOwnListings && !includeUnapproved) {
      query = query.eq("is_approved", true);
    }

    // Apply filters
    if (species && ["dog", "cat", "other"].includes(species)) {
      query = query.eq("species", species);
    }
    if (breed) {
      query = query.ilike("breed", `%${breed}%`);
    }
    if (size && ["small", "medium", "large"].includes(size)) {
      query = query.eq("size", size);
    }
    if (gender && ["male", "female", "unknown"].includes(gender)) {
      query = query.eq("gender", gender);
    }
    if (location) {
      query = query.or(`location_city.ilike.%${location}%,location_country.ilike.%${location}%`);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,pet_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/adoptions", error), { status: 500 });
    }

    // Fetch user profiles for all listings
    const userIds = [...new Set((listings ?? []).map(l => l.user_id))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name, avatar_url, is_shelter, shelter_name")
      .in("id", userIds);
    
    const profilesMap = new Map((profiles ?? []).map(p => [p.id, p]));

    // Sort images and attach user profiles
    const sortedListings = (listings ?? []).map((listing) => ({
      ...listing,
      images: listing.images?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) ?? [],
      user: profilesMap.get(listing.user_id) || null,
    }));

    return NextResponse.json({
      listings: sortedListings,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/adoptions", e), { status: 500 });
  }
}

// POST /api/adoptions - Create a new listing (authenticated)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
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
    } = body;

    // Validate required fields
    if (!title || !description || !pet_name || !species) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Validate species
    if (!["dog", "cat", "other"].includes(species)) {
      return NextResponse.json(createError("E2002"), { status: 400 });
    }

    const listingData = {
      user_id: user.id,
      title,
      description,
      pet_name,
      species,
      breed: breed || null,
      age_years: age_years || 0,
      age_months: age_months || 0,
      gender: gender || null,
      size: size || null,
      location_city: location_city || null,
      location_country: location_country || null,
      story: story || null,
      status: "available" as const,
      is_approved: true, // Auto-approved for now (change to false for production)
    };

    const admin = createSupabaseAdminClient();
    
    const { data: listing, error } = await admin
      .from("adoption_listings")
      .insert(listingData)
      .select(`*`)
      .single();
    
    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/adoptions insert", error), { status: 500 });
    }

    // Fetch the full listing with relations using admin client
    const { data: fullListing, error: fetchError } = await admin
      .from("adoption_listings")
      .select(`
        *,
        images:adoption_images(id, image_url, display_order),
        user:profiles(id, name, avatar_url, is_shelter, shelter_name)
      `)
      .eq("id", listing.id)
      .single();

    if (fetchError) {
      // Listing was created but fetch failed - return basic listing
      return NextResponse.json({ listing }, { status: 201 });
    }

    return NextResponse.json({ listing: fullListing }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/adoptions", e), { status: 500 });
  }
}
