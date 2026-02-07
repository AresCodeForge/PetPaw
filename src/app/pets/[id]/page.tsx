import { createClient } from "@supabase/supabase-js";
import PublicPetProfileClient from "./PublicPetProfileClient";
import PublicPetProfileNotFound from "./PublicPetProfileNotFound";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { data: pet } = await supabase
    .from("pets")
    .select("name, type")
    .eq("id", id)
    .single();
  if (!pet) return { title: "Κατοικίδιο — PetPaw" };
  return {
    title: `${pet.name} — PetPaw`,
    description: `Δημόσιο προφίλ για ${pet.name} (${pet.type}).`,
  };
}

export default async function PublicPetPage({ params }: PageProps) {
  const { id } = await params;

  const { data: pet, error } = await supabase
    .from("pets")
    .select("id, name, type, age, description, medication_notes, image_url, is_lost, owner_id")
    .eq("id", id)
    .single();

  const { data: petImages } = await supabase
    .from("pet_images")
    .select("image_url, sort_order")
    .eq("pet_id", id)
    .order("sort_order", { ascending: true });

  const imageUrls = (petImages ?? []).map((r) => r.image_url);
  const primaryImage = imageUrls[0] ?? pet?.image_url ?? null;

  if (error || !pet) {
    return <PublicPetProfileNotFound />;
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <PublicPetProfileClient
        petId={pet.id}
        ownerId={pet.owner_id}
        imageUrls={imageUrls}
        primaryImage={primaryImage}
        petName={pet.name}
        isLost={!!pet.is_lost}
        pet={{
          type: pet.type,
          age: pet.age,
          description: pet.description,
          medication_notes: pet.medication_notes,
        }}
      />
    </div>
  );
}
