"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";

type SearchResult = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
  category: {
    id: string;
    name_en: string;
    name_el: string;
  } | null;
};

type Props = {
  className?: string;
};

export default function BlogSearch({ className = "" }: Props) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/blog/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Search failed");
      }

      setResults(data.posts || []);
      setIsOpen(true);
    } catch (e) {
      console.error("[PetPaw] Search error:", e);
      setError(lang === "el" ? "Αποτυχία αναζήτησης" : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-foreground-subtle" />
          ) : (
            <Search className="h-5 w-5 text-foreground-subtle" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "el" ? "Αναζήτηση άρθρων..." : "Search articles..."}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-foreground placeholder-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-border transition-colors duration-300"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-subtle hover:text-foreground-muted transition-colors duration-300"
            aria-label={lang === "el" ? "Καθαρισμός" : "Clear"}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-card shadow-lg transition-colors duration-300">
          {error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-foreground-subtle">
              {lang === "el" ? "Δεν βρέθηκαν αποτελέσματα" : "No results found"}
            </div>
          ) : (
            <div className="py-2">
              {results.map((post) => {
                const title = lang === "el" ? post.title_el : post.title_en;
                const excerpt = lang === "el" ? post.excerpt_el : post.excerpt_en;
                const categoryName = post.category
                  ? (lang === "el" ? post.category.name_el : post.category.name_en)
                  : null;

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    onClick={handleResultClick}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-background-secondary transition-colors duration-300"
                  >
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt=""
                        className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-foreground line-clamp-1">{title}</h4>
                      {excerpt && (
                        <p className="mt-0.5 text-sm text-foreground-muted line-clamp-2">{excerpt}</p>
                      )}
                      {categoryName && (
                        <span className="mt-1 inline-block text-xs font-medium text-navy-soft">
                          {categoryName}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
              {results.length >= 6 && (
                <div className="border-t border-border px-4 py-3 text-center">
                  <span className="text-sm text-foreground-muted">
                    {lang === "el"
                      ? "Εμφανίζονται τα πρώτα 6 αποτελέσματα"
                      : "Showing first 6 results"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
