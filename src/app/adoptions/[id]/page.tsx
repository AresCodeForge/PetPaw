"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Ruler,
  Edit,
  Loader2,
  Share2
} from "lucide-react";
import AdoptionGallery from "@/components/adoption/AdoptionGallery";
import StatusBadge from "@/components/adoption/StatusBadge";
import ShelterBadge from "@/components/adoption/ShelterBadge";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";

type Props = {
  params: Promise<{ id: string }>;
};

export default function AdoptionDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLanguage();
  const [listing, setListing] = useState<AdoptionListingRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Get user
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      // Fetch listing
      const response = await fetch(`/api/adoptions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setListing(data.listing);
        setIsOwner(u?.id === data.listing?.user_id);
      } else {
        router.push("/adoptions");
        return;
      }

      // Fetch favorite status
      if (u) {
        const favResponse = await fetch("/api/favorites", { credentials: "include" });
        if (favResponse.ok) {
          const favData = await favResponse.json();
          const isFav = favData.favorites?.some((f: { listing_id: string }) => f.listing_id === id);
          setIsFavorite(isFav);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [id, router]);

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      if (isFavorite) {
        const response = await fetch("/api/favorites", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          const favorite = data.favorites?.find((f: { listing_id: string }) => f.listing_id === id);
          if (favorite) {
            await fetch(`/api/favorites/${favorite.id}`, { 
              method: "DELETE",
              credentials: "include" 
            });
          }
        }
        setIsFavorite(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ listing_id: id }),
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleContact = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Navigate to messages with this listing
    router.push(`/messages?listing=${id}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.pet_name,
          text: listing?.description,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert(lang === "el" ? "Ο σύνδεσμος αντιγράφηκε!" : "Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const labels = {
    back: { en: "Back to listings", el: "Πίσω στις καταχωρήσεις" },
    contact: { en: "Contact about", el: "Επικοινωνία για" },
    about: { en: "About", el: "Σχετικά με" },
    story: { en: "Story", el: "Ιστορία" },
    details: { en: "Details", el: "Λεπτομέρειες" },
    species: { en: "Species", el: "Είδος" },
    breed: { en: "Breed", el: "Ράτσα" },
    age: { en: "Age", el: "Ηλικία" },
    gender: { en: "Gender", el: "Φύλο" },
    size: { en: "Size", el: "Μέγεθος" },
    location: { en: "Location", el: "Τοποθεσία" },
    postedBy: { en: "Posted by", el: "Καταχωρήθηκε από" },
    edit: { en: "Edit", el: "Επεξεργασία" },
    pendingApproval: { en: "Pending admin approval", el: "Σε αναμονή έγκρισης" },
    notProvided: { en: "Not provided", el: "Δεν παρέχεται" },
  };

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

  const sizeLabels = {
    small: { en: "Small", el: "Μικρό" },
    medium: { en: "Medium", el: "Μεσαίο" },
    large: { en: "Large", el: "Μεγάλο" },
  };

  const ageText = formatAge(listing.age_years, listing.age_months, lang);
  const locationText = [listing.location_city, listing.location_country].filter(Boolean).join(", ");

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/adoptions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back[lang]}
        </Link>

        {/* Pending approval notice */}
        {!listing.is_approved && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
            {labels.pendingApproval[lang]}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Gallery */}
          <div>
            <AdoptionGallery 
              images={listing.images || []} 
              petName={listing.pet_name} 
            />
          </div>

          {/* Right: Info */}
          <div>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={listing.status} size="md" />
                  {listing.user?.is_shelter && (
                    <ShelterBadge 
                      shelterName={listing.user.shelter_name}
                      isVerified={!!listing.user.shelter_verified_at}
                      size="md"
                    />
                  )}
                </div>
                <h1 className="text-3xl font-bold text-foreground">{listing.pet_name}</h1>
                <p className="mt-1 text-lg text-foreground-muted">{listing.title}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {isOwner && (
                  <Link
                    href={`/adoptions/${id}/edit`}
                    className="rounded-full bg-card p-3 shadow-sm transition-colors duration-300 hover:shadow-md"
                    title={labels.edit[lang]}
                  >
                    <Edit className="h-5 w-5 text-foreground-muted" />
                  </Link>
                )}
                <button
                  onClick={handleShare}
                  className="rounded-full bg-card p-3 shadow-sm transition-colors duration-300 hover:shadow-md"
                  title={lang === "el" ? "Κοινοποίηση" : "Share"}
                >
                  <Share2 className="h-5 w-5 text-foreground-muted" />
                </button>
                {!isOwner && (
                  <button
                    onClick={handleToggleFavorite}
                    className="rounded-full bg-card p-3 shadow-sm transition-colors duration-300 hover:shadow-md"
                    title={isFavorite 
                      ? (lang === "el" ? "Αφαίρεση από αγαπημένα" : "Remove from favorites")
                      : (lang === "el" ? "Προσθήκη στα αγαπημένα" : "Add to favorites")}
                  >
                    <Heart 
                      className={`h-5 w-5 transition-colors duration-300 ${
                        isFavorite ? "fill-red-500 text-red-500" : "text-foreground-muted"
                      }`} 
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Quick info */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary text-xl">
                  {listing.species === "dog" ? "🐕" : listing.species === "cat" ? "🐈" : "🐾"}
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{labels.species[lang]}</p>
                  <p className="font-medium text-foreground">{speciesLabels[listing.species][lang]}</p>
                </div>
              </div>

              {listing.breed && (
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <span className="text-lg">🏷️</span>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{labels.breed[lang]}</p>
                    <p className="font-medium text-foreground">{listing.breed}</p>
                  </div>
                </div>
              )}

              {ageText && (
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <Calendar className="h-5 w-5 text-navy-soft" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{labels.age[lang]}</p>
                    <p className="font-medium text-foreground">{ageText}</p>
                  </div>
                </div>
              )}

              {listing.gender && (
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <span className="text-lg">{listing.gender === "male" ? "♂️" : "♀️"}</span>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{labels.gender[lang]}</p>
                    <p className="font-medium text-foreground">{genderLabels[listing.gender][lang]}</p>
                  </div>
                </div>
              )}

              {listing.size && (
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <Ruler className="h-5 w-5 text-navy-soft" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{labels.size[lang]}</p>
                    <p className="font-medium text-foreground">{sizeLabels[listing.size][lang]}</p>
                  </div>
                </div>
              )}

              {locationText && (
                <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <MapPin className="h-5 w-5 text-navy-soft" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{labels.location[lang]}</p>
                    <p className="font-medium text-foreground">{locationText}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6 rounded-xl bg-card p-5 shadow-sm transition-colors duration-300">
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                {labels.about[lang]} {listing.pet_name}
              </h2>
              <p className="whitespace-pre-wrap text-foreground-muted">{listing.description}</p>
            </div>

            {/* Story */}
            {listing.story && (
              <div className="mb-6 rounded-xl bg-card p-5 shadow-sm transition-colors duration-300">
                <h2 className="mb-3 text-lg font-semibold text-foreground">{labels.story[lang]}</h2>
                <p className="whitespace-pre-wrap text-foreground-muted">{listing.story}</p>
              </div>
            )}

            {/* Posted by */}
            <div className="mb-6 flex items-center justify-between rounded-xl bg-card p-4 shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-3">
                {listing.user?.avatar_url ? (
                  <img
                    src={listing.user.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary text-lg font-medium text-foreground-muted">
                    {listing.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm text-foreground-muted">{labels.postedBy[lang]}</p>
                  <p className="font-medium text-foreground">
                    {listing.user?.name || (lang === "el" ? "Ανώνυμος" : "Anonymous")}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-foreground-subtle">
                {new Date(listing.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
              </p>
            </div>

            {/* Contact button */}
            {!isOwner && listing.status === "available" && (
              <button
                onClick={handleContact}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-soft py-4 text-lg font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
              >
                <MessageCircle className="h-5 w-5" />
                {labels.contact[lang]} {listing.pet_name}
              </button>
            )}
          </div>
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
