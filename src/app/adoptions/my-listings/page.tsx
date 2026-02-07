"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Plus, ArrowLeft, Loader2, PawPrint, Edit, Trash2, Eye, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/adoption/StatusBadge";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";

export default function MyListingsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [listings, setListings] = useState<AdoptionListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);

  const fetchListings = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/adoptions?user_id=${userId}&include_unapproved=true`);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      fetchListings(u.id);
    };
    checkAuth();
  }, [router, fetchListings]);

  const handleDelete = async (listingId: string) => {
    if (!confirm(lang === "el" 
      ? "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καταχώρηση;" 
      : "Are you sure you want to delete this listing?")) {
      return;
    }

    try {
      const response = await fetch(`/api/adoptions/${listingId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  };

  const handleStatusChange = async (listingId: string, newStatus: "available" | "pending" | "adopted") => {
    try {
      const response = await fetch(`/api/adoptions/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const labels = {
    title: { en: "My Listings", el: "Οι Καταχωρήσεις μου" },
    back: { en: "Back to Adoption Corner", el: "Πίσω στη Γωνιά Υιοθεσίας" },
    createNew: { en: "Create New", el: "Νέα Καταχώρηση" },
    noListings: { en: "You haven't created any listings yet", el: "Δεν έχετε δημιουργήσει καμία καταχώρηση ακόμα" },
    createFirst: { en: "Create your first listing", el: "Δημιουργήστε την πρώτη σας καταχώρηση" },
    pendingApproval: { en: "Pending approval", el: "Αναμονή έγκρισης" },
    view: { en: "View", el: "Προβολή" },
    edit: { en: "Edit", el: "Επεξεργασία" },
    delete: { en: "Delete", el: "Διαγραφή" },
    markAvailable: { en: "Mark Available", el: "Διαθέσιμο" },
    markPending: { en: "Mark Pending", el: "Σε αναμονή" },
    markAdopted: { en: "Mark Adopted", el: "Υιοθετήθηκε" },
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          href="/adoptions"
          className="mb-4 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back[lang]}
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {labels.title[lang]}
          </h1>
          <Link
            href="/adoptions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
          >
            <Plus className="h-4 w-4" />
            {labels.createNew[lang]}
          </Link>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-card p-8 text-center shadow-sm">
            <PawPrint className="mb-4 h-16 w-16 text-foreground-subtle" />
            <p className="text-lg font-medium text-foreground">{labels.noListings[lang]}</p>
            <Link
              href="/adoptions/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
            >
              <Plus className="h-4 w-4" />
              {labels.createFirst[lang]}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {/* Image */}
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0].image_url}
                      alt={listing.pet_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-foreground-subtle">
                      {listing.species === "dog" ? "🐕" : listing.species === "cat" ? "🐈" : "🐾"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{listing.pet_name}</h3>
                    <StatusBadge status={listing.status} />
                    {!listing.is_approved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                        <AlertCircle className="h-3 w-3" />
                        {labels.pendingApproval[lang]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-muted">{listing.title}</p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {new Date(listing.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {/* Status dropdown */}
                  <select
                    value={listing.status}
                    onChange={(e) => handleStatusChange(listing.id, e.target.value as "available" | "pending" | "adopted")}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
                  >
                    <option value="available">{labels.markAvailable[lang]}</option>
                    <option value="pending">{labels.markPending[lang]}</option>
                    <option value="adopted">{labels.markAdopted[lang]}</option>
                  </select>

                  <Link
                    href={`/adoptions/${listing.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground-muted transition-colors duration-300 hover:bg-background-secondary"
                  >
                    <Eye className="h-4 w-4" />
                    {labels.view[lang]}
                  </Link>
                  <Link
                    href={`/adoptions/${listing.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground-muted transition-colors duration-300 hover:bg-background-secondary"
                  >
                    <Edit className="h-4 w-4" />
                    {labels.edit[lang]}
                  </Link>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-card px-3 py-1.5 text-sm text-red-600 transition-colors duration-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {labels.delete[lang]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
