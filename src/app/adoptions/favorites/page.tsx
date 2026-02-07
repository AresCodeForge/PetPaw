"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Heart, Loader2, Trash2 } from "lucide-react";
import StatusBadge from "@/components/adoption/StatusBadge";

type FavoriteItem = {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    pet_name: string;
    species: "dog" | "cat" | "other";
    breed: string | null;
    status: "available" | "pending" | "adopted";
    is_approved: boolean;
    images: { id: string; image_url: string; display_order: number }[];
    user: {
      id: string;
      name: string | null;
      avatar_url: string | null;
      is_shelter: boolean;
      shelter_name: string | null;
    };
  };
};

export default function FavoritesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await fetch("/api/favorites", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      fetchFavorites();
    };
    checkAuth();
  }, [router, fetchFavorites]);

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const labels = {
    title: { en: "My Favorites", el: "Τα Αγαπημένα μου" },
    back: { en: "Back to Adoption Corner", el: "Πίσω στη Γωνιά Υιοθεσίας" },
    noFavorites: { en: "You haven't saved any pets yet", el: "Δεν έχετε αποθηκεύσει κανένα κατοικίδιο ακόμα" },
    browsePets: { en: "Browse available pets", el: "Περιηγηθείτε στα διαθέσιμα κατοικίδια" },
    remove: { en: "Remove", el: "Αφαίρεση" },
    view: { en: "View", el: "Προβολή" },
    savedOn: { en: "Saved on", el: "Αποθηκεύτηκε στις" },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/adoptions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back[lang]}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Heart className="h-7 w-7 text-red-400" />
            {labels.title[lang]}
          </h1>
        </div>

        {/* Favorites list */}
        {favorites.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-card p-8 text-center shadow-sm">
            <Heart className="mb-4 h-16 w-16 text-foreground-subtle" />
            <p className="text-lg font-medium text-foreground">{labels.noFavorites[lang]}</p>
            <Link
              href="/adoptions"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
            >
              {labels.browsePets[lang]}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="group overflow-hidden rounded-xl bg-card shadow-sm transition-colors duration-300 hover:shadow-md"
              >
                {/* Image */}
                <Link href={`/adoptions/${fav.listing.id}`} className="block">
                  <div className="relative aspect-video overflow-hidden bg-background-secondary">
                    {fav.listing.images?.[0] ? (
                      <img
                        src={fav.listing.images.sort((a, b) => a.display_order - b.display_order)[0].image_url}
                        alt={fav.listing.pet_name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl text-foreground-subtle">
                        {fav.listing.species === "dog" ? "🐕" : fav.listing.species === "cat" ? "🐈" : "🐾"}
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <StatusBadge status={fav.listing.status} />
                    </div>
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                  <Link href={`/adoptions/${fav.listing.id}`}>
                    <h3 className="mb-1 font-semibold text-foreground transition-colors duration-300 group-hover:text-navy-soft">
                      {fav.listing.pet_name}
                    </h3>
                  </Link>
                  <p className="mb-2 text-sm text-foreground-muted line-clamp-1">{fav.listing.title}</p>
                  <p className="mb-3 text-xs text-foreground-subtle">
                    {labels.savedOn[lang]} {new Date(fav.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/adoptions/${fav.listing.id}`}
                      className="flex-1 rounded-lg bg-navy-soft px-3 py-2 text-center text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
                    >
                      {labels.view[lang]}
                    </Link>
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                      title={labels.remove[lang]}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
