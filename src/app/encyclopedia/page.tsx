"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { filterBreeds, getBreedCounts, type Breed } from "@/lib/breeds";
import BreedCard from "@/components/encyclopedia/BreedCard";
import BreedFilters from "@/components/encyclopedia/BreedFilters";

type FilterState = {
  type: "dog" | "cat" | "all";
  size: "small" | "medium" | "large" | "giant" | "all";
  costLevel: "all" | "budget" | "moderate" | "premium";
  searchQuery: string;
};

export default function EncyclopediaPage() {
  const { t, lang } = useLanguage();
  const [filters, setFilters] = useState<FilterState>({
    type: "all",
    size: "all",
    costLevel: "all",
    searchQuery: "",
  });

  const breedCounts = useMemo(() => getBreedCounts(), []);

  const filteredBreeds = useMemo(() => {
    return filterBreeds({
      type: filters.type,
      size: filters.size,
      costLevel: filters.costLevel,
      searchQuery: filters.searchQuery,
    });
  }, [filters]);

  // Sort breeds alphabetically by name
  const sortedBreeds = useMemo(() => {
    return [...filteredBreeds].sort((a, b) => {
      const nameA = lang === "el" ? a.name_el : a.name_en;
      const nameB = lang === "el" ? b.name_el : b.name_en;
      return nameA.localeCompare(nameB);
    });
  }, [filteredBreeds, lang]);

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy-soft/10">
            <svg className="h-10 w-10 text-navy-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
            {t("encyclopedia_title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-foreground-muted">
            {lang === "el" 
              ? "Ανακαλύψτε πληροφορίες για δημοφιλείς ράτσες σκύλων και γατών" 
              : "Discover information about popular dog and cat breeds"}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <BreedFilters
            filters={filters}
            onChange={setFilters}
            lang={lang}
            breedCounts={breedCounts}
          />
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            {lang === "el" 
              ? `Εμφάνιση ${sortedBreeds.length} ράτσες` 
              : `Showing ${sortedBreeds.length} breeds`}
          </p>
          {filters.searchQuery && (
            <p className="text-sm text-foreground-muted">
              {lang === "el" 
                ? `Αποτελέσματα για "${filters.searchQuery}"` 
                : `Results for "${filters.searchQuery}"`}
            </p>
          )}
        </div>

        {/* Breed Grid */}
        {sortedBreeds.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedBreeds.map((breed) => (
              <BreedCard key={breed.id} breed={breed} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card py-16 text-center transition-colors duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background-secondary">
              <svg className="h-8 w-8 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {lang === "el" ? "Δεν βρέθηκαν ράτσες" : "No breeds found"}
            </h3>
            <p className="text-foreground-muted">
              {lang === "el" 
                ? "Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση" 
                : "Try adjusting your filters or search"}
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 space-y-6">
          {/* Disclaimer */}
          <div className="mx-auto max-w-3xl rounded-xl border border-navy-soft/30 bg-navy-soft/5 p-4 transition-colors duration-300">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-navy-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-left text-sm text-navy-soft">
                {t("encyclopedia_disclaimer")}
              </p>
            </div>
          </div>

          {/* Data Sources */}
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 text-center transition-colors duration-300">
            <p className="text-sm text-foreground-muted">
              <span className="font-medium text-foreground">{t("encyclopedia_data_sources")}:</span>{" "}
              Wikipedia, FCI (Fédération Cynologique Internationale), TICA (The International Cat Association)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
