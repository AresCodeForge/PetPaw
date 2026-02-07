import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createError } from "@/lib/errors";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all breed images (for admin management)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    // Check if admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(createError("E1003"), { status: 403 });
    }

    // Get breed filter from query params
    const { searchParams } = new URL(request.url);
    const breedId = searchParams.get("breed_id");
    const breedType = searchParams.get("breed_type");

    let query = supabaseAdmin
      .from("breed_images")
      .select("*")
      .order("breed_id")
      .order("display_order");

    if (breedId) {
      query = query.eq("breed_id", breedId);
    }

    if (breedType) {
      query = query.eq("breed_type", breedType);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error("Error fetching breed images:", error);
      return NextResponse.json(createError("E5001"), { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(createError("E5001"), { status: 500 });
  }
}

// POST: Add a new breed image
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    // Check if admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(createError("E1003"), { status: 403 });
    }

    const body = await request.json();
    const { breed_id, breed_type, image_url, display_order } = body;

    if (!breed_id || !breed_type || !image_url) {
      return NextResponse.json(
        { error: "breed_id, breed_type, and image_url are required" },
        { status: 400 }
      );
    }

    // Check if we already have 3 images for this breed
    const { data: existingImages, error: countError } = await supabaseAdmin
      .from("breed_images")
      .select("id")
      .eq("breed_id", breed_id);

    if (countError) {
      console.error("Error counting images:", countError);
      return NextResponse.json(createError("E5001"), { status: 500 });
    }

    if (existingImages && existingImages.length >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 images per breed allowed" },
        { status: 400 }
      );
    }

    // Insert the new image
    const { data: image, error } = await supabaseAdmin
      .from("breed_images")
      .insert({
        breed_id,
        breed_type,
        image_url,
        display_order: display_order ?? existingImages?.length ?? 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting breed image:", error);
      return NextResponse.json(createError("E5001"), { status: 500 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(createError("E5001"), { status: 500 });
  }
}

// DELETE: Remove a breed image
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(createError("E1002"), { status: 401 });
    }

    // Check if admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(createError("E1003"), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("id");

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("breed_images")
      .delete()
      .eq("id", imageId);

    if (error) {
      console.error("Error deleting breed image:", error);
      return NextResponse.json(createError("E5001"), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(createError("E5001"), { status: 500 });
  }
}
