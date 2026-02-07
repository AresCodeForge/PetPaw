"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

export default function BreedNotFound() {
  const { lang } = useLanguage();

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        {/* Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#f59e0b]/10">
          <svg className="h-12 w-12 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold text-foreground">
          {lang === "el" ? "Η ράτσα δεν βρέθηκε" : "Breed Not Found"}
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-2xl text-lg text-foreground-muted">
          {lang === "el" 
            ? "Η ράτσα που αναζητάτε δεν υπάρχει στην εγκυκλοπαίδεια μας." 
            : "The breed you're looking for doesn't exist in our encyclopedia."}
        </p>

        {/* Action */}
        <Link href="/encyclopedia">
          <AnimatedButton>
            {lang === "el" ? "Πίσω στην Εγκυκλοπαίδεια" : "Back to Encyclopedia"}
          </AnimatedButton>
        </Link>
      </div>
    </main>
  );
}
