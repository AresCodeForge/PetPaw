"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import ListingForm from "@/components/adoption/ListingForm";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditAdoptionPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLanguage();
  const [listing, setListing] = useState<AdoptionListingRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch listing
      const response = await fetch(`/api/adoptions/${id}`);
      if (!response.ok) {
        router.push("/adoptions");
        return;
      }

      const data = await response.json();
      
      // Check ownership
      if (data.listing.user_id !== user.id) {
        router.push(`/adoptions/${id}`);
        return;
      }

      setListing(data.listing);
      setIsLoading(false);
    };

    fetchData();
  }, [id, router]);

  const labels = {
    back: { en: "Back to listing", el: "Πίσω στην καταχώρηση" },
    title: { en: "Edit Listing", el: "Επεξεργασία Καταχώρησης" },
  };

  if (isLoading || !listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href={`/adoptions/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back[lang]}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {labels.title[lang]}: {listing.pet_name}
          </h1>
        </div>

        {/* Form */}
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <ListingForm listing={listing} mode="edit" />
        </div>
      </div>
    </div>
  );
}
