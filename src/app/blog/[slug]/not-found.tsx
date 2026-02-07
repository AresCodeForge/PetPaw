"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

export default function BlogPostNotFound() {
  const { lang } = useLanguage();

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        {/* Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#f59e0b]/10">
          <svg className="h-12 w-12 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          {lang === "el" ? "Το άρθρο δεν βρέθηκε" : "Post Not Found"}
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-md text-lg text-foreground-muted">
          {lang === "el" 
            ? "Αυτό το άρθρο δεν υπάρχει ή έχει αφαιρεθεί."
            : "This article doesn't exist or has been removed."}
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/blog">
            <AnimatedButton variant="primary">
              {lang === "el" ? "Πίσω στο Ιστολόγιο" : "Back to Blog"}
            </AnimatedButton>
          </Link>
          <Link href="/">
            <AnimatedButton variant="secondary">
              {lang === "el" ? "Αρχική Σελίδα" : "Home Page"}
            </AnimatedButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
