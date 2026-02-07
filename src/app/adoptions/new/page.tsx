"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, PawPrint, Loader2 } from "lucide-react";
import ListingForm from "@/components/adoption/ListingForm";

export default function NewAdoptionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  const labels = {
    back: { en: "Back to listings", el: "Πίσω στις καταχωρήσεις" },
    title: { en: "List a Pet for Adoption", el: "Καταχώρηση Κατοικιδίου για Υιοθεσία" },
    subtitle: { en: "Help find a loving home for a pet in need", el: "Βοηθήστε να βρεθεί ένα αγαπημένο σπίτι για ένα κατοικίδιο που το χρειάζεται" },
    note: { en: "Your listing will be reviewed before it appears publicly.", el: "Η καταχώρηση σας θα ελεγχθεί πριν εμφανιστεί δημόσια." },
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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
            <PawPrint className="h-7 w-7 text-navy-soft" />
            {labels.title[lang]}
          </h1>
          <p className="mt-2 text-foreground-muted">{labels.subtitle[lang]}</p>
        </div>

        {/* Notice */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          {labels.note[lang]}
        </div>

        {/* Form */}
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <ListingForm mode="create" />
        </div>
      </div>
    </div>
  );
}
