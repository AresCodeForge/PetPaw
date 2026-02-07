import { createBrowserClient } from "@supabase/ssr";
import { customAlphabet } from "nanoid";

const nanoid8 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser client: session is stored in cookies so server components and API routes can read it. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/** Create a new browser client instance (for components that need a fresh client). */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Sign in with email and password. */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) console.error("[PetPaw] signInWithPassword error:", { code: "E1001" });
  return { data, error };
}

/** Sign up with email, password, and optional metadata (for Get QR Tag flow). */
export async function signUpWithPassword(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
  if (error) console.error("[PetPaw] signUpWithPassword error:", { code: "E1001" });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[PetPaw] signOut error:", { code: "E1001" });
  return { error };
}

export async function getUser() {
  return supabase.auth.getUser();
}

/** Sign in with Google OAuth. */
export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo || `${window.location.origin}/dashboard`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) console.error("[PetPaw] signInWithGoogle error:", { code: "E1002" });
  return { data, error };
}

export interface CreatePetFromMetadataInput {
  owner_name: string;
  pet_name: string;
  pet_type: string;
  pet_description?: string;
  pet_image_url?: string;
  pet_age?: number;
}

/** Ensure profile exists for user (e.g. after signup with only owner_name). */
export async function ensureProfileFromMetadata(
  userId: string,
  email: string,
  ownerName: string
) {
  const { data: profileExists, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[PetPaw] ensureProfile select error:", { code: "E5001" });
    return { error: selectError };
  }

  if (!profileExists) {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      name: ownerName,
      email,
    });
    if (error) {
      // Profile may already exist (e.g. created by DB trigger on signup) — treat as success
      const code = (error as { code?: string })?.code;
      if (code === "23505") {
        return { error: null };
      }
      console.error("[PetPaw] create profile error:", { code: "E5002" });
    }
    return { error: error ?? null };
  }
  return { error: null };
}

/**
 * Called when user_metadata contains signup data with a pet.
 * Creates profile if needed, then qr_code and pet; links pet to qr_code.
 */
export async function completeRegistrationFromMetadata(
  userId: string,
  email: string,
  metadata: CreatePetFromMetadataInput,
  baseUrl: string
) {
  await ensureProfileFromMetadata(userId, email, metadata.owner_name);

  const { data: existingPets } = await supabase.from("pets").select("id").eq("owner_id", userId);
  if (existingPets && existingPets.length > 0) {
    return { error: null, alreadyCompleted: true };
  }

  const { data: newPet, error: petInsertError } = await supabase
    .from("pets")
    .insert({
      owner_id: userId,
      name: metadata.pet_name,
      type: metadata.pet_type,
      description: metadata.pet_description ?? null,
      image_url: metadata.pet_image_url ?? null,
      age: metadata.pet_age ?? null,
    })
    .select("id")
    .single();

  if (petInsertError || !newPet) {
    console.error("[PetPaw] create pet error:", { code: "E5002" });
    return { error: petInsertError ?? new Error("Failed to create pet") };
  }

  const shortCode = nanoid8();
  const publicUrl = `${baseUrl.replace(/\/$/, "")}/r/${shortCode}`;
  const { data: newQr, error: qrError } = await supabase
    .from("qr_codes")
    .insert({
      pet_id: newPet.id,
      short_code: shortCode,
      qr_code_data: publicUrl,
    })
    .select("id")
    .single();

  if (qrError || !newQr) {
    console.error("[PetPaw] create qr_code error:", { code: "E5002" });
    return { error: qrError ?? new Error("Failed to create QR code") };
  }

  const { error: updateError } = await supabase
    .from("pets")
    .update({ qr_code_id: newQr.id })
    .eq("id", newPet.id);

  if (updateError) {
    console.error("[PetPaw] link qr_code to pet error:", { code: "E5003" });
    return { error: updateError };
  }

  return { error: null, petId: newPet.id };
}

const PET_IMAGES_BUCKET = "pet-images";
const MAX_IMAGES_PER_PET = 3;

/** Upload a pet image to storage and save record in pet_images. Returns public URL or error. */
export async function uploadPetImage(
  userId: string,
  petId: string,
  file: File
): Promise<{ url: string } | { error: Error }> {
  const { data: existing } = await supabase
    .from("pet_images")
    .select("id")
    .eq("pet_id", petId);
  if (existing && existing.length >= MAX_IMAGES_PER_PET) {
    return { error: new Error(`Maximum ${MAX_IMAGES_PER_PET} images per pet.`) };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${petId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PET_IMAGES_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) {
    console.error("[PetPaw] upload pet image error:", { code: "E6001" });
    return { error: uploadError as Error };
  }

  const { data: urlData } = supabase.storage.from(PET_IMAGES_BUCKET).getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const sortOrder = (existing?.length ?? 0);
  const { error: insertError } = await supabase.from("pet_images").insert({
    pet_id: petId,
    image_url: imageUrl,
    sort_order: sortOrder,
  });

  if (insertError) {
    console.error("[PetPaw] insert pet_image error:", { code: "E5002" });
    await supabase.storage.from(PET_IMAGES_BUCKET).remove([path]);
    return { error: insertError as Error };
  }

  return { url: imageUrl };
}

/** Get all images for a pet (ordered by sort_order). */
export async function getPetImages(petId: string) {
  const { data, error } = await supabase
    .from("pet_images")
    .select("id, image_url, sort_order")
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true });
  if (error) return { data: [] as { id: string; image_url: string }[], error };
  return { data: data ?? [], error: null };
}

/** Delete a pet image by id (and remove from storage if path known). */
export async function deletePetImage(imageId: string) {
  const { data: row, error: fetchError } = await supabase
    .from("pet_images")
    .select("id, image_url")
    .eq("id", imageId)
    .single();

  if (fetchError || !row) return { error: fetchError ?? new Error("Not found") };

  const { error: deleteError } = await supabase.from("pet_images").delete().eq("id", imageId);
  if (deleteError) return { error: deleteError };

  const url = row.image_url as string;
  const pathMatch = url.match(/\/storage\/v1\/object\/public\/pet-images\/(.+)$/);
  if (pathMatch?.[1]) {
    await supabase.storage.from(PET_IMAGES_BUCKET).remove([decodeURIComponent(pathMatch[1])]);
  }
  return { error: null };
}

export { MAX_IMAGES_PER_PET };
