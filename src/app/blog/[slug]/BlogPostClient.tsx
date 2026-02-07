"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";
import BlogComments from "@/components/BlogComments";

type RelatedPost = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
};

type Heading = {
  level: number;
  text: string;
  id: string;
};

type BlogPost = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  content_en: string;
  content_el: string;
  content_html_en: string;
  content_html_el: string;
  reading_time_en: number;
  reading_time_el: number;
  headings_en: Heading[];
  headings_el: Heading[];
  excerpt_en: string | null;
  excerpt_el: string | null;
  featured_image: string | null;
  published_at: string;
  writer_name: string | null;
  category: { id: string; slug: string; name_en: string; name_el: string } | null;
};

type Props = {
  post: BlogPost;
};

// Related Posts Component
function RelatedPosts({ postId, lang }: { postId: string; lang: string }) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/related?postId=${postId}&limit=3`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error("[PetPaw] Error fetching related posts:", e);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchRelated();
  }, [fetchRelated]);

  if (loading) {
    return (
      <div className="mt-12 border-t border-border pt-8">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
        </div>
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="mt-12 border-t border-border pt-8">
      <h3 className="mb-6 text-xl font-semibold text-foreground">
        {lang === "el" ? "Σχετικά Άρθρα" : "Related Articles"}
      </h3>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const title = lang === "el" ? post.title_el : post.title_en;
          const excerpt = lang === "el" ? post.excerpt_el : post.excerpt_en;
          
          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors duration-300 hover:shadow-md"
            >
              {post.featured_image && (
                <div className="aspect-[16/9] overflow-hidden bg-background-secondary">
                  <img
                    src={post.featured_image}
                    alt={title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-navy-soft transition-colors duration-300">
                  {title}
                </h4>
                {excerpt && (
                  <p className="mt-2 text-sm text-foreground-muted line-clamp-2">
                    {excerpt}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Table of Contents Component
function TableOfContents({ headings, lang }: { headings: Heading[]; lang: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (headings.length < 3) return null; // Only show TOC for longer articles

  return (
    <div className="mb-8 rounded-xl border border-border bg-card transition-colors duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-foreground"
      >
        <span>{lang === "el" ? "Πίνακας Περιεχομένων" : "Table of Contents"}</span>
        <svg
          className={`h-5 w-5 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <nav className="border-t border-border px-5 py-4">
          <ul className="space-y-2">
            {headings.map((heading, index) => (
              <li
                key={index}
                style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}
              >
                <a
                  href={`#${heading.id}`}
                  className="text-sm text-navy-soft transition-colors duration-300 hover:opacity-80 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

export default function BlogPostClient({ post }: Props) {
  const { lang } = useLanguage();
  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  
  const title = lang === "el" ? post.title_el : post.title_en;
  const contentHtml = lang === "el" ? post.content_html_el : post.content_html_en;
  const readingTime = lang === "el" ? post.reading_time_el : post.reading_time_en;
  const headings = lang === "el" ? post.headings_el : post.headings_en;
  const categoryName = post.category 
    ? (lang === "el" ? post.category.name_el : post.category.name_en)
    : null;

  const formattedDate = new Date(post.published_at).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Use state for shareUrl to avoid hydration mismatch
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Bar - Back link left, Category right */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-navy-soft shadow-sm transition-colors duration-300 hover:bg-navy-soft hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {lang === "el" ? "Ιστολόγιο" : "Blog"}
          </Link>

          {categoryName && (
            <Link
              href={`/blog?category=${post.category?.slug}`}
              className="inline-flex rounded-full bg-navy-soft px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-300 hover:opacity-90"
            >
              {categoryName}
            </Link>
          )}
        </div>

        {/* Featured Image - Responsive container */}
        {post.featured_image && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-border shadow-lg">
            <img
              src={post.featured_image}
              alt={title}
              className="w-full object-contain"
              style={{ maxHeight: "70vh" }}
            />
          </div>
        )}

        {/* Date and Reading Time */}
        <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-navy-soft">
          <span>{formattedDate}</span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {readingTime} {lang === "el" ? "λεπτά ανάγνωσης" : "min read"}
          </span>
        </div>

        {/* Title */}
        <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h1>

        {/* Divider */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Table of Contents */}
        <TableOfContents headings={headings} lang={lang} />

        {/* Content - rendered from server-processed HTML */}
        <div 
          className="prose-petpaw"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Author attribution below article */}
        <div className="mt-12 flex items-center justify-between border-t border-border pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint text-xl font-semibold text-white shadow-md">
              {(post.writer_name || "P").charAt(0).toUpperCase()}
            </div>
            <div>
<p className="text-sm text-foreground-subtle">
              {lang === "el" ? "Γράφτηκε από" : "Written by"}
            </p>
            <p className="font-semibold text-foreground">
                {post.writer_name || "PetPaw Team"}
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground-subtle">
            {formattedDate}
          </p>
        </div>

        {/* Share Section with Icons */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 transition-colors duration-300">
          <h3 className="text-center font-semibold text-foreground">
            {lang === "el" ? "Μοιραστείτε αυτό το άρθρο" : "Share this article"}
          </h3>
          <div className="mt-4 flex justify-center gap-4">
            {/* Twitter/X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#000000] text-white shadow-md transition hover:scale-110 hover:shadow-lg"
              title="Share on X"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-md transition hover:scale-110 hover:shadow-lg"
              title="Share on Facebook"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-md transition hover:scale-110 hover:shadow-lg"
              title="Share on LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(title + " " + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition hover:scale-110 hover:shadow-lg"
              title="Share on WhatsApp"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>

            {/* Copy Link */}
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert(lang === "el" ? "Ο σύνδεσμος αντιγράφηκε!" : "Link copied!");
                }
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground-muted text-white shadow-md transition-colors duration-300 hover:scale-110 hover:shadow-lg"
              title={lang === "el" ? "Αντιγραφή συνδέσμου" : "Copy link"}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Related Posts */}
        <RelatedPosts postId={post.id} lang={lang} />

        {/* Comments Section */}
        <BlogComments postId={post.id} />

        {/* Back to Blog Button */}
        <div className="mt-10 flex justify-center">
          <Link href="/blog">
            <AnimatedButton variant="secondary">
              {lang === "el" ? "Περισσότερα Άρθρα" : "More Articles"}
            </AnimatedButton>
          </Link>
        </div>
      </article>
    </main>
  );
}
