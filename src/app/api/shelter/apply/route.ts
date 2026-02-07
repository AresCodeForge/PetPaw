import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

// POST /api/shelter/apply - Submit shelter application
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Check if user is already a verified shelter
    const { data: profile } = await admin
      .from("profiles")
      .select("is_shelter, shelter_verified_at")
      .eq("id", user.id)
      .single();

    if (profile?.is_shelter && profile?.shelter_verified_at) {
      return NextResponse.json(createError("E4009"), { status: 400 });
    }

    // Check for pending application
    const { data: pendingApp } = await admin
      .from("shelter_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingApp) {
      return NextResponse.json(createError("E4008"), { status: 400 });
    }

    const formData = await request.formData();
    const organization_name = formData.get("organization_name") as string;
    const registration_number = formData.get("registration_number") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;
    const website = formData.get("website") as string;
    const description = formData.get("description") as string;
    const documents = formData.getAll("documents") as File[];

    // Validate required fields
    if (!organization_name) {
      return NextResponse.json(createError("E2001"), { status: 400 });
    }

    // Upload documents
    const documentUrls: string[] = [];
    
    for (const doc of documents) {
      if (!doc || !doc.size) continue;

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(doc.type)) {
        return NextResponse.json(createError("E6003"), { status: 400 });
      }

      // Validate file size (10MB)
      if (doc.size > 10 * 1024 * 1024) {
        return NextResponse.json(createError("E6002"), { status: 400 });
      }

      // Upload to storage
      const ext = doc.name.split(".").pop() || "pdf";
      const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await admin.storage
        .from("shelter-documents")
        .upload(filename, doc, {
          contentType: doc.type,
          upsert: false,
        });

      if (uploadError) {
        // Try to create bucket if it doesn't exist
        if (uploadError.message?.includes("not found") || uploadError.message?.includes("does not exist")) {
          await admin.storage.createBucket("shelter-documents", {
            public: false,
            fileSizeLimit: 10 * 1024 * 1024,
            allowedMimeTypes: allowedTypes,
          });
          
          // Retry upload
          const { error: retryError } = await admin.storage
            .from("shelter-documents")
            .upload(filename, doc, {
              contentType: doc.type,
              upsert: false,
            });

          if (retryError) {
            console.error("Document upload retry failed:", retryError);
            continue;
          }
        } else {
          console.error("Document upload failed:", uploadError);
          continue;
        }
      }

      // Store the path (not public URL since bucket is private)
      documentUrls.push(filename);
    }

    // Create application
    const { data: application, error } = await admin
      .from("shelter_applications")
      .insert({
        user_id: user.id,
        organization_name,
        registration_number: registration_number || null,
        address: address || null,
        phone: phone || null,
        website: website || null,
        description: description || null,
        document_urls: documentUrls,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(logAndCreateError("E5002", "POST /api/shelter/apply", error), { status: 500 });
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "POST /api/shelter/apply", e), { status: 500 });
  }
}
