"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Calendar, Heart } from "lucide-react";
import StatusBadge from "./StatusBadge";
import ShelterBadge from "./ShelterBadge";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";

type Props = {
  listing: AdoptionListingRow;
  isFavorite?: boolean;
  onToggleFavorite?: (listingId: string) => void;
  showFavoriteButton?: boolean;
};

export default function AdoptionCard({ 
  listing, 
  isFavorite = false, 
  onToggleFavorite,
  showFavoriteButton = true 
}: Props) {
  const { lang } = useLanguage();
  
  const mainImage = listing.images?.[0]?.image_url;
  const ageText = formatAge(listing.age_years, listing.age_months, lang);
  const locationText = [listing.location_city, listing.location_country].filter(Boolean).join(", ");

  const speciesLabels = {
    dog: { en: "Dog", el: "Σκύλος" },
    cat: { en: "Cat", el: "Γάτα" },
    other: { en: "Other", el: "Άλλο" },
  };

  const genderLabels = {
    male: { en: "Male", el: "Αρσενικό" },
    female: { en: "Female", el: "Θηλυκό" },
    unknown: { en: "Unknown", el: "Άγνωστο" },
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-navy-soft/30">
      {/* Image - aspect-[4/3] for consistent card sizing across site */}
      <Link href={`/adoptions/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-background-secondary">
          {mainImage ? (
            <img
              src={mainImage}
              alt={listing.pet_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-foreground-subtle">
              {listing.species === "dog" ? "🐕" : listing.species === "cat" ? "🐈" : "🐾"}
            </div>
          )}
          
          {/* Status badge overlay */}
          <div className="absolute left-2 top-2">
            <StatusBadge status={listing.status} />
          </div>
        </div>
      </Link>

      {/* Favorite button */}
      {showFavoriteButton && onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(listing.id);
          }}
          className="absolute right-2 top-2 z-10 rounded-full bg-card/90 p-2 shadow-sm transition-colors duration-300 hover:bg-card hover:shadow-md"
          title={isFavorite 
            ? (lang === "el" ? "Αφαίρεση από αγαπημένα" : "Remove from favorites")
            : (lang === "el" ? "Προσθήκη στα αγαπημένα" : "Add to favorites")}
        >
          <Heart 
            className={`h-5 w-5 transition-colors duration-300 ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
            }`} 
          />
        </button>
      )}

      {/* Content */}
      <div className="p-4">
        <Link href={`/adoptions/${listing.id}`}>
          <h3 className="mb-1 truncate text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-navy-soft">
            {listing.pet_name}
          </h3>
        </Link>

        <p className="mb-2 text-sm text-foreground-muted">
          {speciesLabels[listing.species][lang]}
          {listing.breed && ` • ${listing.breed}`}
          {listing.gender && ` • ${genderLabels[listing.gender][lang]}`}
        </p>

        {/* Age */}
        {ageText && (
          <div className="mb-2 flex items-center gap-1 text-sm text-foreground-muted">
            <Calendar className="h-4 w-4" />
            {ageText}
          </div>
        )}

        {/* Location */}
        {locationText && (
          <div className="mb-2 flex items-center gap-1 text-sm text-foreground-muted">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        {/* Posted by */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            {listing.user?.avatar_url ? (
              <img
                src={listing.user.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-xs font-medium text-foreground-muted">
                {listing.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span className="text-xs text-foreground-muted truncate max-w-[100px]">
              {listing.user?.name || (lang === "el" ? "Ανώνυμος" : "Anonymous")}
            </span>
          </div>
          
          {listing.user?.is_shelter && listing.user?.shelter_name && (
            <ShelterBadge 
              shelterName={listing.user.shelter_name}
              isVerified={!!listing.user.shelter_verified_at}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatAge(years: number, months: number, lang: "en" | "el"): string {
  const parts: string[] = [];
  
  if (years > 0) {
    parts.push(lang === "el" 
      ? `${years} ${years === 1 ? "έτος" : "έτη"}`
      : `${years} ${years === 1 ? "year" : "years"}`);
  }
  
  if (months > 0) {
    parts.push(lang === "el"
      ? `${months} ${months === 1 ? "μήνας" : "μήνες"}`
      : `${months} ${months === 1 ? "month" : "months"}`);
  }
  
  return parts.join(", ");
}
