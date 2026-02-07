import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createError } from "@/lib/errors";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Valid top-level fields that can be overridden
const ALLOWED_FIELDS = new Set([
  "name_en",
  "name_el",
  "description_en",
  "description_el",
  "care_en",
  "care_el",
  "health_en",
  "health_el",
  "temperament_en",
  "temperament_el",
  "origin",
  "originCode",
  "size",
  "lifespan",
  "cost_annual_usd",
  // Characteristics are stored as nested: "characteristics.energy", etc.
  "characteristics.energy",
  "characteristics.grooming",
  "characteristics.friendliness",
  "characteristics.trainability",
  "characteristics.cost_index",
]);

// PUT: Update a single field in a breed's overrides
export async function PUT(request: NextRequest) {
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
    const { breed_id, field, value } = body;

    if (!breed_id || !field || value === undefined) {
      return NextResponse.json(
        { error: "breed_id, field, and value are required" },
        { status: 400 }
      );
    }

    // Validate field name
    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { error: `Field '${field}' is not an allowed override field` },
        { status: 400 }
      );
    }

    // Fetch existing overrides (if any)
    const { data: existing } = await supabaseAdmin
      .from("breed_overrides")
      .select("overrides")
      .eq("breed_id", breed_id)
      .single();

    // Build the new overrides object by merging field into existing
    const currentOverrides = existing?.overrides || {};

    // Handle nested characteristics fields
    if (field.startsWith("characteristics.")) {
      const charKey = field.split(".")[1];
      const currentChars = currentOverrides.characteristics || {};
      currentOverrides.characteristics = {
        ...currentChars,
        [charKey]: value,
      };
    } else {
      currentOverrides[field] = value;
    }

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabaseAdmin
      .from("breed_overrides")
      .upsert(
        {
          breed_id,
          overrides: currentOverrides,
          updated_by: user.id,
        },
        { onConflict: "breed_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting breed override:", error);
      return NextResponse.json(createError("E5001"), { status: 500 });
    }

    return NextResponse.json({
      success: true,
      overrides: data.overrides,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(createError("E5001"), { status: 500 });
  }
}

// DELETE: Reset a specific field override (or all overrides for a breed)
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
    const breedId = searchParams.get("breed_id");
    const field = searchParams.get("field");

    if (!breedId) {
      return NextResponse.json(
        { error: "breed_id is required" },
        { status: 400 }
      );
    }

    if (field) {
      // Remove a specific field from overrides
      const { data: existing } = await supabaseAdmin
        .from("breed_overrides")
        .select("overrides")
        .eq("breed_id", breedId)
        .single();

      if (existing) {
        const updatedOverrides = { ...existing.overrides };

        if (field.startsWith("characteristics.")) {
          const charKey = field.split(".")[1];
          if (updatedOverrides.characteristics) {
            delete updatedOverrides.characteristics[charKey];
            // Remove characteristics object if empty
            if (Object.keys(updatedOverrides.characteristics).length === 0) {
              delete updatedOverrides.characteristics;
            }
          }
        } else {
          delete updatedOverrides[field];
        }

        // If no overrides left, delete the row entirely
        if (Object.keys(updatedOverrides).length === 0) {
          await supabaseAdmin
            .from("breed_overrides")
            .delete()
            .eq("breed_id", breedId);
        } else {
          await supabaseAdmin
            .from("breed_overrides")
            .update({ overrides: updatedOverrides, updated_by: user.id })
            .eq("breed_id", breedId);
        }
      }
    } else {
      // Delete all overrides for this breed
      await supabaseAdmin
        .from("breed_overrides")
        .delete()
        .eq("breed_id", breedId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(createError("E5001"), { status: 500 });
  }
}
