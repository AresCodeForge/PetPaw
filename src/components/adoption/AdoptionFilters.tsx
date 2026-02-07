"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, Filter, X, ChevronDown } from "lucide-react";

export type FilterValues = {
  search: string;
  species: string;
  size: string;
  gender: string;
  location: string;
};

type Props = {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset: () => void;
};

export default function AdoptionFilters({ values, onChange, onReset }: Props) {
  const { lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = values.species || values.size || values.gender || values.location;

  const labels = {
    search: { en: "Search pets...", el: "Αναζήτηση κατοικιδίων..." },
    species: { en: "Species", el: "Είδος" },
    size: { en: "Size", el: "Μέγεθος" },
    gender: { en: "Gender", el: "Φύλο" },
    location: { en: "Location", el: "Τοποθεσία" },
    filters: { en: "Filters", el: "Φίλτρα" },
    reset: { en: "Reset", el: "Επαναφορά" },
    all: { en: "All", el: "Όλα" },
  };

  const speciesOptions = [
    { value: "", label: labels.all[lang] },
    { value: "dog", label: lang === "el" ? "Σκύλος" : "Dog" },
    { value: "cat", label: lang === "el" ? "Γάτα" : "Cat" },
    { value: "other", label: lang === "el" ? "Άλλο" : "Other" },
  ];

  const sizeOptions = [
    { value: "", label: labels.all[lang] },
    { value: "small", label: lang === "el" ? "Μικρό" : "Small" },
    { value: "medium", label: lang === "el" ? "Μεσαίο" : "Medium" },
    { value: "large", label: lang === "el" ? "Μεγάλο" : "Large" },
  ];

  const genderOptions = [
    { value: "", label: labels.all[lang] },
    { value: "male", label: lang === "el" ? "Αρσενικό" : "Male" },
    { value: "female", label: lang === "el" ? "Θηλυκό" : "Female" },
  ];

  return (
    <div className="mb-6 rounded-xl bg-card p-4 shadow-sm">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="text"
          value={values.search}
          onChange={(e) => onChange({ ...values, search: e.target.value })}
          placeholder={labels.search[lang]}
          className="w-full rounded-lg border border-border bg-background-secondary py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
        />
      </div>

      {/* Filter toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2 text-left text-sm text-foreground-muted transition-colors duration-300 hover:bg-background-secondary"
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          {labels.filters[lang]}
          {hasActiveFilters && (
            <span className="rounded-full bg-navy-soft px-2 py-0.5 text-xs text-white">
              {[values.species, values.size, values.gender, values.location].filter(Boolean).length}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Species */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.species[lang]}
            </label>
            <select
              value={values.species}
              onChange={(e) => onChange({ ...values, species: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            >
              {speciesOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Size */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.size[lang]}
            </label>
            <select
              value={values.size}
              onChange={(e) => onChange({ ...values, size: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            >
              {sizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.gender[lang]}
            </label>
            <select
              value={values.gender}
              onChange={(e) => onChange({ ...values, gender: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            >
              {genderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.location[lang]}
            </label>
            <input
              type="text"
              value={values.location}
              onChange={(e) => onChange({ ...values, location: e.target.value })}
              placeholder={lang === "el" ? "Πόλη ή χώρα..." : "City or country..."}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            />
          </div>
        </div>
      )}

      {/* Reset button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="mt-4 flex items-center gap-1 text-sm text-navy-soft transition-colors duration-300 hover:text-navy-soft/90"
        >
          <X className="h-4 w-4" />
          {labels.reset[lang]}
        </button>
      )}
    </div>
  );
}
