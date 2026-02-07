"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";
import Loader from "@/components/Loader";
import BlogSearch from "@/components/BlogSearch";

type BlogPost = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
  writer_name: string | null;
  category: { id: string; slug: string; name_en: string; name_el: string } | null;
};

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
};

export default function BlogPage() {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 9;

  const fetchCategories = async () => {
    const res = await fetch("/api/blog/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    let url = `/api/blog/posts?page=${page}&limit=${limit}`;
    if (selectedCategory) {
      url += `&category=${selectedCategory}`;
    }
    const res = await fetch(url);
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [page, selectedCategory]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
  };

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            {t("blog_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground-muted">
            {lang === "el" 
              ? "Άρθρα, νέα και συμβουλές για τη φροντίδα των κατοικιδίων σας"
              : "Articles, news and tips for caring for your pets"}
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 max-w-md">
            <BlogSearch />
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleCategoryChange("")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === ""
                  ? "bg-navy-soft text-white"
                  : "bg-card text-foreground-muted shadow-sm hover:bg-background-secondary transition-colors duration-300"
              }`}
            >
              {lang === "el" ? "Όλα" : "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === cat.slug
                    ? "bg-navy-soft text-white"
                    : "bg-card text-foreground-muted shadow-sm hover:bg-background-secondary transition-colors duration-300"
                }`}
              >
                {lang === "el" ? cat.name_el : cat.name_en}
              </button>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        {loading ? (
          <div className="mt-12">
            <Loader label={t("common_loading")} />
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border bg-card p-12 text-center transition-colors duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f59e0b]/10">
              <svg className="h-8 w-8 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {lang === "el" ? "Δεν υπάρχουν άρθρα ακόμα" : "No posts yet"}
            </h2>
            <p className="mt-2 text-foreground-muted">
              {lang === "el" 
                ? "Σύντομα θα δημοσιεύσουμε νέα άρθρα!"
                : "We'll publish new articles soon!"}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-navy-soft/30"
                >
                  {/* Featured Image - compact */}
                  <div className="aspect-[2/1] overflow-hidden bg-background-secondary">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={lang === "el" ? post.title_el : post.title_en}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-10 w-10 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    {/* Title */}
                    <h2 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-navy-soft transition-colors duration-300">
                      {lang === "el" ? post.title_el : post.title_en}
                    </h2>

                    {/* Author & Date */}
                    <div className="mt-2 flex items-center justify-between text-xs text-foreground-subtle">
                      <span>{post.writer_name || "PetPaw"}</span>
                      <span>
                        {new Date(post.published_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground-muted transition-colors duration-300 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lang === "el" ? "Προηγούμενη" : "Previous"}
                </button>
                <span className="px-4 text-sm text-foreground-muted">
                  {lang === "el" ? `Σελίδα ${page} από ${totalPages}` : `Page ${page} of ${totalPages}`}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground-muted transition-colors duration-300 hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lang === "el" ? "Επόμενη" : "Next"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Back Button */}
        <div className="mt-12 flex justify-center">
          <Link href="/">
            <AnimatedButton variant="secondary">
              {t("common_back_home")}
            </AnimatedButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
