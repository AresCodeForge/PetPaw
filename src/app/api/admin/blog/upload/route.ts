import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// POST /api/admin/blog/upload - Upload an image for blog posts
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(createError("E6003"), { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(createError("E6002"), { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `blog/${timestamp}-${randomId}.${ext}`;

    // Upload to Supabase Storage
    const admin = createSupabaseAdminClient();
    const buffer = await file.arrayBuffer();
    
    const { data, error } = await admin.storage
      .from("blog-images")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        // Create the bucket
        await admin.storage.createBucket("blog-images", {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        });
        
        // Retry upload
        const { data: retryData, error: retryError } = await admin.storage
          .from("blog-images")
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: false,
          });
        
        if (retryError) {
          return NextResponse.json(logAndCreateError("E6001", "POST /api/admin/blog/upload retry", retryError), { status: 500 });
        }
        
        // Get public URL
        const { data: urlData } = admin.storage.from("blog-images").getPublicUrl(retryData.path);
        return NextResponse.json({ url: urlData.publicUrl });
      }
      
      return NextResponse.json(logAndCreateError("E6001", "POST /api/admin/blog/upload", error), { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage.from("blog-images").getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/admin/blog/upload", e), { status: 500 });
  }
}
