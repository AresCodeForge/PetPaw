"use client";

type FilterState = {
  type: "dog" | "cat" | "all";
  size: "small" | "medium" | "large" | "giant" | "all";
  costLevel: "all" | "budget" | "moderate" | "premium";
  searchQuery: string;
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  lang: string;
  breedCounts: { dogs: number; cats: number; total: number };
};

export default function BreedFilters({ filters, onChange, lang, breedCounts }: Props) {
  const t = {
    all: lang === "el" ? "Όλα" : "All",
    dogs: lang === "el" ? "Σκύλοι" : "Dogs",
    cats: lang === "el" ? "Γάτες" : "Cats",
    small: lang === "el" ? "Μικρό" : "Small",
    medium: lang === "el" ? "Μεσαίο" : "Medium",
    large: lang === "el" ? "Μεγάλο" : "Large",
    giant: lang === "el" ? "Γίγαντας" : "Giant",
    search: lang === "el" ? "Αναζήτηση ράτσας..." : "Search breeds...",
    type: lang === "el" ? "Τύπος" : "Type",
    size: lang === "el" ? "Μέγεθος" : "Size",
    cost: lang === "el" ? "Κόστος" : "Cost",
    budget: lang === "el" ? "Οικονομικό" : "Budget",
    moderate: lang === "el" ? "Μέτριο" : "Moderate",
    premium: lang === "el" ? "Υψηλό" : "Premium",
    clearAll: lang === "el" ? "Καθαρισμός" : "Clear all",
  };

  const hasActiveFilters = filters.type !== "all" || filters.size !== "all" || filters.costLevel !== "all" || filters.searchQuery.length > 0;

  const handleClearAll = () => {
    onChange({
      type: "all",
      size: "all",
      costLevel: "all",
      searchQuery: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          placeholder={t.search}
          className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-4 text-foreground placeholder-foreground-subtle shadow-sm transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-border"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onChange({ ...filters, searchQuery: "" })}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors duration-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-background-secondary p-1 transition-colors duration-300">
          <button
            onClick={() => onChange({ ...filters, type: "all" })}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filters.type === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.all} ({breedCounts.total})
          </button>
          <button
            onClick={() => onChange({ ...filters, type: "dog" })}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filters.type === "dog"
                ? "bg-card text-navy-soft shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            <span>🐕</span>
            {t.dogs} ({breedCounts.dogs})
          </button>
          <button
            onClick={() => onChange({ ...filters, type: "cat" })}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filters.type === "cat"
                ? "bg-card text-[#8b5cf6] shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            <span>🐈</span>
            {t.cats} ({breedCounts.cats})
          </button>
        </div>

        {/* Size Dropdown */}
        <div className="relative">
          <select
            value={filters.size}
            onChange={(e) => onChange({ ...filters, size: e.target.value as FilterState["size"] })}
            className="appearance-none rounded-xl border border-border bg-card py-2.5 pl-4 pr-10 text-sm font-medium text-foreground shadow-sm transition-colors duration-300 hover:border-navy-soft/30 focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-border"
          >
            <option value="all">{t.size}: {t.all}</option>
            <option value="small">{t.small}</option>
            <option value="medium">{t.medium}</option>
            <option value="large">{t.large}</option>
            <option value="giant">{t.giant}</option>
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Cost Dropdown */}
        <div className="relative">
          <select
            value={filters.costLevel}
            onChange={(e) => onChange({ ...filters, costLevel: e.target.value as FilterState["costLevel"] })}
            className="appearance-none rounded-xl border border-border bg-card py-2.5 pl-4 pr-10 text-sm font-medium text-foreground shadow-sm transition-colors duration-300 hover:border-navy-soft/30 focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-border"
          >
            <option value="all">{t.cost}: {t.all}</option>
            <option value="budget">💰 {t.budget} (1-2)</option>
            <option value="moderate">💰 {t.moderate} (3)</option>
            <option value="premium">💰 {t.premium} (4-5)</option>
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors duration-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t.clearAll}
          </button>
        )}
      </div>
    </div>
  );
}
