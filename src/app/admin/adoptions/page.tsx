"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Check, 
  X, 
  Trash2, 
  Eye, 
  Loader2, 
  Filter,
  PawPrint
} from "lucide-react";
import StatusBadge from "@/components/adoption/StatusBadge";
import ShelterBadge from "@/components/adoption/ShelterBadge";

type AdminListing = {
  id: string;
  user_id: string;
  title: string;
  pet_name: string;
  species: "dog" | "cat" | "other";
  breed: string | null;
  status: "available" | "pending" | "adopted";
  is_approved: boolean;
  created_at: string;
  images: { id: string; image_url: string; display_order: number }[];
  user: {
    id: string;
    name: string | null;
    email: string;
    is_shelter: boolean;
    shelter_name: string | null;
  };
};

export default function AdminAdoptionsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter === "pending") {
        params.set("approved", "false");
      } else if (filter === "approved") {
        params.set("approved", "true");
      }

      const response = await fetch(`/api/admin/adoptions?${params}`, { credentials: "include" });
      if (response.status === 403) {
        router.push("/");
        return;
      }
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
  }, [page, filter, router]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/adoptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_approved: true }),
      });

      if (response.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, is_approved: true } : l))
        );
      }
    } catch (error) {
      console.error("Error approving listing:", error);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm(lang === "el" 
      ? "Είστε σίγουροι ότι θέλετε να απορρίψετε αυτή την καταχώρηση;" 
      : "Are you sure you want to reject this listing?")) {
      return;
    }

    try {
      await fetch(`/api/admin/adoptions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setListings((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error("Error rejecting listing:", error);
    }
  };

  const labels = {
    title: { en: "Adoption Listings", el: "Καταχωρήσεις Υιοθεσίας" },
    all: { en: "All", el: "Όλα" },
    pendingApproval: { en: "Pending Approval", el: "Σε Αναμονή" },
    approved: { en: "Approved", el: "Εγκρίθηκαν" },
    noListings: { en: "No listings found", el: "Δεν βρέθηκαν καταχωρήσεις" },
    approve: { en: "Approve", el: "Έγκριση" },
    reject: { en: "Reject", el: "Απόρριψη" },
    view: { en: "View", el: "Προβολή" },
    postedBy: { en: "Posted by", el: "Από" },
    previous: { en: "Previous", el: "Προηγούμενο" },
    next: { en: "Next", el: "Επόμενο" },
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <PawPrint className="h-6 w-6 text-navy-soft" />
          {labels.title[lang]}
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-background-secondary p-1">
          {(["all", "pending", "approved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {f === "all" && labels.all[lang]}
              {f === "pending" && labels.pendingApproval[lang]}
              {f === "approved" && labels.approved[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Listings table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-card p-8 text-center shadow-sm transition-colors duration-300">
          <PawPrint className="mb-4 h-12 w-12 text-foreground-subtle" />
          <p className="text-foreground-muted">{labels.noListings[lang]}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card shadow-sm transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-background-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    {lang === "el" ? "Κατοικίδιο" : "Pet"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    {labels.postedBy[lang]}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    {lang === "el" ? "Κατάσταση" : "Status"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    {lang === "el" ? "Ημερομηνία" : "Date"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground-muted">
                    {lang === "el" ? "Ενέργειες" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-background-secondary transition-colors duration-300">
                    {/* Pet */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                          {listing.images?.[0] ? (
                            <img
                              src={listing.images.sort((a, b) => a.display_order - b.display_order)[0].image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl text-foreground-subtle">
                              {listing.species === "dog" ? "🐕" : listing.species === "cat" ? "🐈" : "🐾"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{listing.pet_name}</p>
                          <p className="text-sm text-foreground-muted">{listing.title}</p>
                        </div>
                      </div>
                    </td>

                    {/* Posted by */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-foreground">{listing.user.name || listing.user.email}</p>
                        {listing.user.is_shelter && (
                          <ShelterBadge shelterName={listing.user.shelter_name} size="sm" />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={listing.status} />
                        <span className={`text-xs ${listing.is_approved ? "text-green-600" : "text-yellow-600"}`}>
                          {listing.is_approved 
                            ? (lang === "el" ? "Εγκρίθηκε" : "Approved")
                            : (lang === "el" ? "Σε αναμονή" : "Pending")}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {new Date(listing.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/adoptions/${listing.id}`}
                          className="rounded-lg p-2 text-foreground-muted transition-colors duration-300 hover:bg-background-secondary hover:text-navy-soft"
                          title={labels.view[lang]}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {!listing.is_approved && (
                          <button
                            onClick={() => handleApprove(listing.id)}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                            title={labels.approve[lang]}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleReject(listing.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title={labels.reject[lang]}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-foreground-muted">
                {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted transition-colors duration-300 hover:bg-background-secondary disabled:opacity-50"
                >
                  {labels.previous[lang]}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted transition-colors duration-300 hover:bg-background-secondary disabled:opacity-50"
                >
                  {labels.next[lang]}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
