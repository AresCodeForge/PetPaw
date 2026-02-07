import { getBreedBySlug, getRelatedBreeds, getAllBreeds } from "@/lib/breeds";
import { notFound } from "next/navigation";
import BreedDetailClient from "./BreedDetailClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const breeds = getAllBreeds();
  return breeds.map((breed) => ({
    slug: breed.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const breed = getBreedBySlug(slug);
  
  if (!breed) {
    return {
      title: "Breed Not Found | PetPaw",
    };
  }

  return {
    title: `${breed.name_en} | Pet Encyclopedia | PetPaw`,
    description: breed.description_en.slice(0, 160),
  };
}

export default async function BreedDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const breed = getBreedBySlug(slug);

  if (!breed) {
    notFound();
  }

  const relatedBreeds = getRelatedBreeds(breed, 3);

  return <BreedDetailClient breed={breed} relatedBreeds={relatedBreeds} />;
}
