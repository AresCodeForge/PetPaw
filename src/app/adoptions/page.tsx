"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Plus, Heart, Loader2, PawPrint, MessageCircle } from "lucide-react";
import AdoptionCard from "@/components/adoption/AdoptionCard";
import AdoptionFilters, { type FilterValues } from "@/components/adoption/AdoptionFilters";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";
import type { ConversationWithDetails } from "@/app/api/messages/route";

const INITIAL_FILTERS: FilterValues = {
  search: "",
  species: "",
  size: "",
  gender: "",
  location: "",
};

export default function AdoptionsPage() {
  const { lang } = useLanguage();
  const [listings, setListings] = useState<AdoptionListingRow[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const limit = 12;

  // Check auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
    };
    getUser();
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/messages", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const count = (data.conversations || []).reduce((sum: number, c: ConversationWithDetails) => sum + (c.unread_count || 0), 0);
          setUnreadMessagesCount(count);
        }
      } catch {
        setUnreadMessagesCount(0);
      }
    };
    fetchUnreadCount();
  }, [user]);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.species) params.set("species", filters.species);
      if (filters.size) params.set("size", filters.size);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.location) params.set("location", filters.location);

      const response = await fetch(`/api/adoptions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/favorites", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFavorites(new Set(data.favorites?.map((f: { listing_id: string }) => f.listing_id) || []));
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    const isFavorite = favorites.has(listingId);
    
    try {
      if (isFavorite) {
        // Get favorite ID first
        const response = await fetch("/api/favorites", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          const favorite = data.favorites?.find((f: { listing_id: string }) => f.listing_id === listingId);
          if (favorite) {
            await fetch(`/api/favorites/${favorite.id}`, { 
              method: "DELETE",
              credentials: "include" 
            });
          }
        }
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ listing_id: listingId }),
        });
        setFavorites((prev) => new Set([...prev, listingId]));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const labels = {
    title: { en: "Adoption Corner", el: "Γωνιά Υιοθεσίας" },
    subtitle: { en: "Find your furry friend!", el: "Υιοθετήστε τον φουντωτό σας φίλο!" },
    createListing: { en: "List a Pet", el: "Καταχώρηση" },
    myListings: { en: "My Listings", el: "Οι Καταχωρήσεις μου" },
    favorites: { en: "Favorites", el: "Αγαπημένα" },
    messages: { en: "Messages", el: "Μηνύματα" },
    noListings: { en: "No pets found matching your criteria", el: "Δεν βρέθηκαν κατοικίδια με αυτά τα κριτήρια" },
    beFirst: { en: "Be the first to list a pet for adoption!", el: "Γίνετε οι πρώτοι που θα καταχωρήσετε ένα κατοικίδιο προς υιοθεσία!" },
    previous: { en: "Previous", el: "Προηγούμενο" },
    next: { en: "Next", el: "Επόμενο" },
    showing: { en: "Showing", el: "Εμφάνιση" },
    of: { en: "of", el: "από" },
    pets: { en: "pets", el: "κατοικίδια" },
  };

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
              {labels.title[lang]}
              <PawPrint className="h-8 w-8 text-navy-soft" />
            </h1>
            <p className="mt-1 text-foreground-muted">{labels.subtitle[lang]}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <>
                <Link
                  href="/adoptions/favorites"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary"
                >
                  <Heart className="h-4 w-4 text-red-400" />
                  {labels.favorites[lang]}
                  {favorites.size > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                      {favorites.size}
                    </span>
                  )}
                </Link>
                <Link
                  href="/messages"
                  className={`inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary ${
                    unreadMessagesCount > 0 ? "border-[#f97316] bg-[#fff7ed] dark:bg-[#f97316]/10" : "border-border"
                  }`}
                >
                  <MessageCircle className={`h-4 w-4 ${unreadMessagesCount > 0 ? "text-[#f97316]" : "text-navy-soft"}`} />
                  {labels.messages[lang]}
                  {unreadMessagesCount > 0 && (
                    <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-bold text-white">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/adoptions/my-listings"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary"
                >
                  {labels.myListings[lang]}
                </Link>
              </>
            )}
            <Link
              href={user ? "/adoptions/new" : "/login"}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
            >
              <Plus className="h-4 w-4" />
              {labels.createListing[lang]}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <AdoptionFilters
          values={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
        />

        {/* Results count */}
        {!isLoading && total > 0 && (
          <p className="mb-4 text-sm text-foreground-muted">
            {labels.showing[lang]} {(page - 1) * limit + 1}-{Math.min(page * limit, total)} {labels.of[lang]} {total} {labels.pets[lang]}
          </p>
        )}

        {/* Listings grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-card p-8 text-center shadow-sm transition-colors duration-300">
            <PawPrint className="mb-4 h-16 w-16 text-foreground-subtle" />
            <p className="text-lg font-medium text-foreground">
              {total === 0 && !Object.values(filters).some(Boolean) 
                ? labels.beFirst[lang]
                : labels.noListings[lang]}
            </p>
            {user && total === 0 && (
              <Link
                href="/adoptions/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
              >
                <Plus className="h-4 w-4" />
                {labels.createListing[lang]}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <AdoptionCard
                key={listing.id}
                listing={listing}
                isFavorite={favorites.has(listing.id)}
                onToggleFavorite={handleToggleFavorite}
                showFavoriteButton={!!user}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.previous[lang]}
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors duration-300 ${
                      page === pageNum
                        ? "bg-navy-soft text-white"
                        : "border border-border bg-card text-foreground hover:bg-background-secondary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.next[lang]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
