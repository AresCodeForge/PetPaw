import dogsData from "@/data/breeds/dogs.json";
import dogsFci1 from "@/data/breeds/dogs-fci1.json";
import dogsFci2 from "@/data/breeds/dogs-fci2.json";
import dogsFci3 from "@/data/breeds/dogs-fci3.json";
import dogsFci45 from "@/data/breeds/dogs-fci4-5.json";
import dogsFci6 from "@/data/breeds/dogs-fci6.json";
import dogsFci78 from "@/data/breeds/dogs-fci7-8.json";
import dogsFci9 from "@/data/breeds/dogs-fci9.json";
import dogsFci10Extra from "@/data/breeds/dogs-fci10-extra.json";
import catsData from "@/data/breeds/cats.json";
import catsExtra from "@/data/breeds/cats-extra.json";

export type Breed = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  type: "dog" | "cat";
  origin: string;
  originCode: string; // ISO country code for flag
  images: string[]; // Array of images (may be empty)
  size: "small" | "medium" | "large" | "giant";
  lifespan: string;
  temperament_en: string[];
  temperament_el: string[];
  description_en: string;
  description_el: string;
  characteristics: {
    energy: number;
    grooming: number;
    friendliness: number;
    trainability: number;
    cost_index: number; // 1-5 maintenance cost level
  };
  cost_annual_usd: string; // e.g. "$800-1,200"
  care_en: string;
  care_el: string;
  health_en: string;
  health_el: string;
};

// Get flag image URL from flagcdn.com
export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

// Cast and combine all breeds
const allBreeds: Breed[] = [
  ...(dogsData as Breed[]),
  ...(dogsFci1 as Breed[]),
  ...(dogsFci2 as Breed[]),
  ...(dogsFci3 as Breed[]),
  ...(dogsFci45 as Breed[]),
  ...(dogsFci6 as Breed[]),
  ...(dogsFci78 as Breed[]),
  ...(dogsFci9 as Breed[]),
  ...(dogsFci10Extra as Breed[]),
  ...(catsData as Breed[]),
  ...(catsExtra as Breed[]),
];

/**
 * Get all breeds
 */
export function getAllBreeds(): Breed[] {
  return allBreeds;
}

/**
 * Get breed by slug
 */
export function getBreedBySlug(slug: string): Breed | undefined {
  return allBreeds.find((breed) => breed.slug === slug);
}

/**
 * Get breeds by type (dog or cat)
 */
export function getBreedsByType(type: "dog" | "cat"): Breed[] {
  return allBreeds.filter((breed) => breed.type === type);
}

/**
 * Filter breeds by multiple criteria
 */
export function filterBreeds(options: {
  type?: "dog" | "cat" | "all";
  size?: Breed["size"] | "all";
  costLevel?: "all" | "budget" | "moderate" | "premium";
  minEnergy?: number;
  maxEnergy?: number;
  minGrooming?: number;
  maxGrooming?: number;
  minFriendliness?: number;
  searchQuery?: string;
}): Breed[] {
  let filtered = [...allBreeds];

  // Filter by type
  if (options.type && options.type !== "all") {
    filtered = filtered.filter((breed) => breed.type === options.type);
  }

  // Filter by size
  if (options.size && options.size !== "all") {
    filtered = filtered.filter((breed) => breed.size === options.size);
  }

  // Filter by cost level
  if (options.costLevel && options.costLevel !== "all") {
    const costRanges: Record<string, [number, number]> = {
      budget: [1, 2],
      moderate: [3, 3],
      premium: [4, 5],
    };
    const [min, max] = costRanges[options.costLevel];
    filtered = filtered.filter(
      (breed) =>
        breed.characteristics.cost_index >= min &&
        breed.characteristics.cost_index <= max
    );
  }

  // Filter by energy level
  if (options.minEnergy !== undefined) {
    filtered = filtered.filter((breed) => breed.characteristics.energy >= options.minEnergy!);
  }
  if (options.maxEnergy !== undefined) {
    filtered = filtered.filter((breed) => breed.characteristics.energy <= options.maxEnergy!);
  }

  // Filter by grooming needs
  if (options.minGrooming !== undefined) {
    filtered = filtered.filter((breed) => breed.characteristics.grooming >= options.minGrooming!);
  }
  if (options.maxGrooming !== undefined) {
    filtered = filtered.filter((breed) => breed.characteristics.grooming <= options.maxGrooming!);
  }

  // Filter by friendliness
  if (options.minFriendliness !== undefined) {
    filtered = filtered.filter((breed) => breed.characteristics.friendliness >= options.minFriendliness!);
  }

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (breed) =>
        breed.name_en.toLowerCase().includes(query) ||
        breed.name_el.toLowerCase().includes(query) ||
        breed.temperament_en.some((t) => t.toLowerCase().includes(query)) ||
        breed.temperament_el.some((t) => t.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Get related breeds (same type, different breed)
 */
export function getRelatedBreeds(breed: Breed, limit = 3): Breed[] {
  return allBreeds
    .filter((b) => b.type === breed.type && b.id !== breed.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}

/**
 * Get breed counts
 */
export function getBreedCounts(): { dogs: number; cats: number; total: number } {
  const dogs = allBreeds.filter((b) => b.type === "dog").length;
  const cats = allBreeds.filter((b) => b.type === "cat").length;
  return { dogs, cats, total: dogs + cats };
}
