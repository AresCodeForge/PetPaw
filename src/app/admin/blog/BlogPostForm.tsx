"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
};

type BlogPostFormProps = {
  mode: "create" | "edit";
  postId?: string;
};

export default function BlogPostForm({ mode, postId }: BlogPostFormProps) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [slug, setSlug] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleEl, setTitleEl] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentEl, setContentEl] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [excerptEl, setExcerptEl] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [metaDescEn, setMetaDescEn] = useState("");
  const [metaDescEl, setMetaDescEl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [writerName, setWriterName] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/admin/blog/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
      }
    };
    fetchCategories();
  }, []);

  // Fetch existing post data for edit mode
  useEffect(() => {
    if (mode === "edit" && postId) {
      const fetchPost = async () => {
        const res = await fetch(`/api/admin/blog/posts/${postId}`, { credentials: "include" });
        setLoading(false);
        if (res.ok) {
          const data = await res.json();
          const post = data.post;
          setSlug(post.slug);
          setTitleEn(post.title_en);
          setTitleEl(post.title_el);
          setContentEn(post.content_en);
          setContentEl(post.content_el);
          setExcerptEn(post.excerpt_en || "");
          setExcerptEl(post.excerpt_el || "");
          setFeaturedImage(post.featured_image || "");
          setMetaDescEn(post.meta_description_en || "");
          setMetaDescEl(post.meta_description_el || "");
          setCategoryId(post.category_id || "");
          setWriterName(post.writer_name || "");
          setStatus(post.status);
        } else {
          alert(lang === "el" ? "Το άρθρο δεν βρέθηκε" : "Post not found");
          router.push("/admin/blog");
        }
      };
      fetchPost();
    }
  }, [mode, postId, lang, router]);

  // Auto-generate slug from English title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleEnChange = (value: string) => {
    setTitleEn(value);
    if (mode === "create" && !slug) {
      setSlug(generateSlug(value));
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert(lang === "el" ? "Μη έγκυρος τύπος αρχείου. Χρησιμοποιήστε JPG, PNG, GIF ή WebP." : "Invalid file type. Use JPG, PNG, GIF or WebP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(lang === "el" ? "Το αρχείο είναι πολύ μεγάλο. Μέγιστο 5MB." : "File is too large. Maximum 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFeaturedImage(data.url);
      } else {
        alert(lang === "el" ? "Αποτυχία μεταφόρτωσης εικόνας" : "Failed to upload image");
      }
    } catch {
      alert(lang === "el" ? "Σφάλμα δικτύου" : "Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slug || !titleEn || !titleEl) {
      alert(lang === "el" ? "Συμπληρώστε τίτλο (και στις δύο γλώσσες) και slug" : "Fill in title (both languages) and slug");
      return;
    }

    if (!writerName) {
      alert(lang === "el" ? "Συμπληρώστε το όνομα του συγγραφέα" : "Fill in the writer's name");
      return;
    }

    setSaving(true);

    const payload = {
      slug,
      title_en: titleEn,
      title_el: titleEl,
      content_en: contentEn,
      content_el: contentEl,
      excerpt_en: excerptEn || null,
      excerpt_el: excerptEl || null,
      featured_image: featuredImage || null,
      meta_description_en: metaDescEn || null,
      meta_description_el: metaDescEl || null,
      category_id: categoryId || null,
      writer_name: writerName || null,
      status,
    };

    try {
      const url = mode === "create" 
        ? "/api/admin/blog/posts" 
        : `/api/admin/blog/posts/${postId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin/blog");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Save error:", data);
        
        // More specific error handling
        if (data.message?.includes("Slug already exists")) {
          alert(lang === "el" ? "Αυτό το slug υπάρχει ήδη" : "This slug already exists");
        } else if (data.code === "E5002" || data.code === "E5003") {
          // Database error - likely missing column
          alert(lang === "el" 
            ? "Σφάλμα βάσης δεδομένων. Βεβαιωθείτε ότι έχετε εφαρμόσει τις μεταφορές." 
            : "Database error. Please ensure migrations have been applied.");
        } else if (data.code === "E1001") {
          alert(lang === "el" ? "Η συνεδρία έληξε. Παρακαλώ συνδεθείτε ξανά." : "Session expired. Please log in again.");
        } else if (data.code === "E1002") {
          alert(lang === "el" ? "Δεν έχετε δικαιώματα διαχειριστή." : "You don't have admin permissions.");
        } else {
          alert(lang === "el" 
            ? `Αποτυχία αποθήκευσης: ${data.code || "Άγνωστο σφάλμα"}` 
            : `Failed to save: ${data.code || "Unknown error"}`);
        }
      }
    } catch {
      alert(lang === "el" ? "Σφάλμα δικτύου" : "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/admin/blog"
        className="mb-6 inline-flex items-center gap-2 text-navy-soft hover:underline transition-colors duration-300"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {lang === "el" ? "Πίσω στο Ιστολόγιο" : "Back to Blog"}
      </Link>

      <h1 className="text-3xl font-bold text-foreground">
        {mode === "create" 
          ? (lang === "el" ? "Νέο Άρθρο" : "New Post")
          : (lang === "el" ? "Επεξεργασία Άρθρου" : "Edit Post")}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Basic Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Slug (URL)"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="my-blog-post"
            required
          />
          <Input
            label={lang === "el" ? "Όνομα Συγγραφέα" : "Writer's Name"}
            type="text"
            value={writerName}
            onChange={(e) => setWriterName(e.target.value)}
            placeholder={lang === "el" ? "π.χ. Μαρία Παπαδοπούλου" : "e.g. John Smith"}
            required
          />
        </div>

        {/* Category and Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            as="select"
            label={lang === "el" ? "Κατηγορία" : "Category"}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{lang === "el" ? "— Χωρίς κατηγορία —" : "— No category —"}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {lang === "el" ? cat.name_el : cat.name_en}
              </option>
            ))}
          </Input>

          <Input
            as="select"
            label={lang === "el" ? "Κατάσταση" : "Status"}
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
          >
            <option value="draft">{lang === "el" ? "Πρόχειρο" : "Draft"}</option>
            <option value="published">{lang === "el" ? "Δημοσιευμένο" : "Published"}</option>
            <option value="archived">{lang === "el" ? "Αρχειοθετημένο" : "Archived"}</option>
          </Input>
        </div>

        {/* Featured Image - Upload or URL */}
        <div className="rounded-xl border border-border bg-card p-6 transition-colors duration-300">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {lang === "el" ? "Κύρια Εικόνα" : "Featured Image"}
          </h3>
          
          <div className="space-y-4">
            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-navy-soft px-4 py-2 text-sm font-medium text-navy-soft transition-colors duration-300 hover:bg-navy-soft/10 ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploading 
                  ? (lang === "el" ? "Μεταφόρτωση..." : "Uploading...")
                  : (lang === "el" ? "Ανέβασμα Εικόνας" : "Upload Image")}
              </label>
              <span className="ml-3 text-sm text-foreground-muted">
                {lang === "el" ? "ή χρησιμοποιήστε URL παρακάτω" : "or use URL below"}
              </span>
            </div>

            {/* URL Input */}
            <Input
              label={lang === "el" ? "URL Εικόνας" : "Image URL"}
              type="url"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />

            {/* Preview */}
            {featuredImage && (
              <div className="relative">
                <img 
                  src={featuredImage} 
                  alt="Preview" 
                  className="h-48 w-full rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).alt = lang === "el" ? "Αποτυχία φόρτωσης εικόνας" : "Failed to load image";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImage("")}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* English Content */}
        <div className="rounded-xl border border-border bg-card p-6 transition-colors duration-300">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <span className="rounded bg-navy-soft px-2 py-0.5 text-xs text-white">EN</span>
            English Content
          </h3>
          <div className="space-y-4">
            <Input
              label="Title"
              type="text"
              value={titleEn}
              onChange={(e) => handleTitleEnChange(e.target.value)}
              placeholder="Enter post title"
              required
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Content <span className="font-normal text-foreground-muted">(Markdown supported - use ![alt](url) for inline images)</span>
              </label>
              <textarea
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder="Write your post content in Markdown..."
                rows={10}
                className="input-field w-full font-mono text-sm"
              />
            </div>
            <Input
              label="Excerpt (short summary for previews)"
              as="textarea"
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              placeholder="Short summary for previews..."
            />
            <Input
              label="Meta Description (SEO)"
              type="text"
              value={metaDescEn}
              onChange={(e) => setMetaDescEn(e.target.value)}
              placeholder="SEO meta description (max 160 chars)"
              maxLength={160}
            />
          </div>
        </div>

        {/* Greek Content */}
        <div className="rounded-xl border border-border bg-card p-6 transition-colors duration-300">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <span className="rounded bg-navy-soft px-2 py-0.5 text-xs text-white">EL</span>
            Ελληνικό Περιεχόμενο
          </h3>
          <div className="space-y-4">
            <Input
              label="Τίτλος"
              type="text"
              value={titleEl}
              onChange={(e) => setTitleEl(e.target.value)}
              placeholder="Εισάγετε τίτλο άρθρου"
              required
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Περιεχόμενο <span className="font-normal text-foreground-muted">(Υποστήριξη Markdown - χρησιμοποιήστε ![alt](url) για ενσωματωμένες εικόνες)</span>
              </label>
              <textarea
                value={contentEl}
                onChange={(e) => setContentEl(e.target.value)}
                placeholder="Γράψτε το περιεχόμενο του άρθρου σε Markdown..."
                rows={10}
                className="input-field w-full font-mono text-sm"
              />
            </div>
            <Input
              label="Περίληψη (σύντομη περιγραφή)"
              as="textarea"
              value={excerptEl}
              onChange={(e) => setExcerptEl(e.target.value)}
              placeholder="Σύντομη περίληψη για προεπισκοπήσεις..."
            />
            <Input
              label="Meta Description (SEO)"
              type="text"
              value={metaDescEl}
              onChange={(e) => setMetaDescEl(e.target.value)}
              placeholder="SEO meta description (max 160 χαρακτήρες)"
              maxLength={160}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <AnimatedButton type="submit" variant="primary" disabled={saving}>
            {saving 
              ? (lang === "el" ? "Αποθήκευση..." : "Saving...")
              : (lang === "el" ? "Αποθήκευση" : "Save")}
          </AnimatedButton>
          <AnimatedButton href="/admin/blog" variant="outline">
            {t("common_cancel")}
          </AnimatedButton>
        </div>
      </form>
    </div>
  );
}
