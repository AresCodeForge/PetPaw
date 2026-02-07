"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";

type BlogPost = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  category: { id: string; slug: string; name_en: string; name_el: string } | null;
  author: { id: string; name: string | null; email: string | null } | null;
};

export default function AdminBlogClient() {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const url = statusFilter === "all" 
      ? "/api/admin/blog/posts" 
      : `/api/admin/blog/posts?status=${statusFilter}`;
    const res = await fetch(url, { credentials: "include" });
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setPosts(data.posts ?? []);
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const handleDelete = async (postId: string, title: string) => {
    const confirmed = window.confirm(
      lang === "el" 
        ? `Διαγραφή του άρθρου "${title}";` 
        : `Delete post "${title}"?`
    );
    if (!confirmed) return;

    setDeletingId(postId);
    try {
      const res = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert(lang === "el" ? "Αποτυχία διαγραφής" : "Failed to delete");
      }
    } catch {
      alert(lang === "el" ? "Σφάλμα δικτύου" : "Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return "bg-mint-bg text-[#2d8a4e]";
      case "draft":
        return "bg-[#f59e0b]/20 text-[#b45309]";
      case "archived":
        return "bg-border text-foreground-muted";
      default:
        return "bg-border text-foreground-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published":
        return lang === "el" ? "Δημοσιευμένο" : "Published";
      case "draft":
        return lang === "el" ? "Πρόχειρο" : "Draft";
      case "archived":
        return lang === "el" ? "Αρχειοθετημένο" : "Archived";
      default:
        return status;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {lang === "el" ? "Διαχείριση Ιστολογίου" : "Blog Management"}
          </h1>
          <p className="mt-2 text-foreground-muted">
            {lang === "el" 
              ? "Δημιουργία, επεξεργασία και δημοσίευση άρθρων" 
              : "Create, edit, and publish blog posts"}
          </p>
        </div>
        <Link href="/admin/blog/new">
          <AnimatedButton variant="primary">
            {lang === "el" ? "Νέο Άρθρο" : "New Post"}
          </AnimatedButton>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="mt-6 flex gap-2">
        {["all", "draft", "published", "archived"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              statusFilter === status
                ? "bg-navy-soft text-white"
                : "bg-border text-foreground-muted hover:bg-border/80"
            }`}
          >
            {status === "all" 
              ? (lang === "el" ? "Όλα" : "All")
              : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label={t("common_loading")} />
      ) : posts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-background-secondary p-8 text-center transition-colors duration-300">
          <p className="text-foreground-muted">
            {lang === "el" ? "Δεν υπάρχουν άρθρα ακόμα." : "No posts yet."}
          </p>
          <div className="mt-4">
            <Link href="/admin/blog/new">
              <AnimatedButton variant="primary">
                {lang === "el" ? "Δημιουργία πρώτου άρθρου" : "Create first post"}
              </AnimatedButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm transition-colors duration-300">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {lang === "el" ? "Τίτλος" : "Title"}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {lang === "el" ? "Κατηγορία" : "Category"}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {lang === "el" ? "Κατάσταση" : "Status"}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {lang === "el" ? "Ημερομηνία" : "Date"}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {lang === "el" ? "Ενέργειες" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {lang === "el" ? post.title_el : post.title_en}
                      </p>
                      <p className="text-xs text-foreground-subtle">/{post.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {post.category 
                      ? (lang === "el" ? post.category.name_el : post.category.name_en)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(post.status)}`}>
                      {getStatusLabel(post.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : new Date(post.created_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="rounded-lg bg-navy-soft/10 px-3 py-1.5 text-sm font-medium text-navy-soft transition-colors duration-300 hover:bg-navy-soft/20"
                      >
                        {lang === "el" ? "Επεξεργασία" : "Edit"}
                      </Link>
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-lg bg-mint-bg px-3 py-1.5 text-sm font-medium text-[#2d8a4e] transition-colors duration-300 hover:bg-mint-bg"
                      >
                        {lang === "el" ? "Προβολή" : "View"}
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, lang === "el" ? post.title_el : post.title_en)}
                        disabled={deletingId === post.id}
                        className="rounded-lg bg-[#ef4444]/10 px-3 py-1.5 text-sm font-medium text-[#ef4444] transition hover:bg-[#ef4444]/20 disabled:opacity-50"
                      >
                        {deletingId === post.id 
                          ? (lang === "el" ? "..." : "...") 
                          : (lang === "el" ? "Διαγραφή" : "Delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <AnimatedButton href="/dashboard" variant="outline">
          {t("common_back")}
        </AnimatedButton>
      </div>
    </div>
  );
}
