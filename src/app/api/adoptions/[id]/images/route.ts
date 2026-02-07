import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// POST /api/adoptions/[id]/images - Upload images for a listing
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: listingId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check listing ownership
    const { data: listing } = await admin
      .from("adoption_listings")
      .select("user_id")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Check current image count
    const { count: currentCount } = await admin
      .from("adoption_images")
      .select("id", { count: "exact" })
      .eq("listing_id", listingId);

    if ((currentCount ?? 0) >= MAX_IMAGES) {
      return NextResponse.json(createError("E4004"), { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images") as File[];

    if (!files.length) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Check if adding these files would exceed limit
    if ((currentCount ?? 0) + files.length > MAX_IMAGES) {
      return NextResponse.json(createError("E4004"), { status: 400 });
    }

    const uploadedImages: { id: string; image_url: string; display_order: number }[] = [];
    let displayOrder = currentCount ?? 0;

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(createError("E6002"), { status: 400 });
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(createError("E6003"), { status: 400 });
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${user.id}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await admin.storage
        .from("adoption-images")
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        // Try to create bucket if it doesn't exist
        if (uploadError.message?.includes("not found") || uploadError.message?.includes("does not exist")) {
          await admin.storage.createBucket("adoption-images", {
            public: true,
            fileSizeLimit: MAX_FILE_SIZE,
            allowedMimeTypes: ALLOWED_TYPES,
          });
          
          // Retry upload
          const { error: retryError } = await admin.storage
            .from("adoption-images")
            .upload(filename, file, {
              contentType: file.type,
              upsert: false,
            });

          if (retryError) {
            console.error("Image upload retry failed:", retryError);
            continue;
          }
        } else {
          console.error("Image upload failed:", uploadError);
          continue;
        }
      }

      // Get public URL
      const { data: urlData } = admin.storage
        .from("adoption-images")
        .getPublicUrl(filename);

      // Save to database
      const { data: imageRecord, error: dbError } = await admin
        .from("adoption_images")
        .insert({
          listing_id: listingId,
          image_url: urlData.publicUrl,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (!dbError && imageRecord) {
        uploadedImages.push(imageRecord);
        displayOrder++;
      }
    }

    return NextResponse.json({ images: uploadedImages }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/adoptions/[id]/images", e), { status: 500 });
  }
}

// DELETE /api/adoptions/[id]/images - Delete an image
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: listingId } = await context.params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("image_id");

    if (!imageId) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check listing ownership
    const { data: listing } = await admin
      .from("adoption_listings")
      .select("user_id")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return NextResponse.json(createError("E3010"), { status: 404 });
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Get image to delete from storage
    const { data: image } = await admin
      .from("adoption_images")
      .select("image_url")
      .eq("id", imageId)
      .eq("listing_id", listingId)
      .single();

    if (image) {
      // Extract path from URL and delete from storage
      try {
        const url = new URL(image.image_url);
        const path = url.pathname.split("/adoption-images/")[1];
        if (path) {
          await admin.storage.from("adoption-images").remove([path]);
        }
      } catch {
        // Ignore storage deletion errors
      }
    }

    // Delete from database
    const { error } = await admin
      .from("adoption_images")
      .delete()
      .eq("id", imageId)
      .eq("listing_id", listingId);

    if (error) {
      return NextResponse.json(logAndCreateError("E5004", "DELETE /api/adoptions/[id]/images", error), { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "DELETE /api/adoptions/[id]/images", e), { status: 500 });
  }
}
