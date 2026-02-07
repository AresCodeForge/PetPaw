"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pencil, X, Plus, Trash2, Loader2 } from "lucide-react";

type BreedImage = {
  id: string;
  breed_id: string;
  breed_type: string;
  image_url: string;
  display_order: number;
};

type Props = {
  breedId: string;
  breedType: "dog" | "cat";
  defaultImages: string[];
  onImagesUpdate?: (images: string[]) => void;
};

export default function BreedImageEditor({
  breedId,
  breedType,
  defaultImages,
  onImagesUpdate,
}: Props) {
  const { lang } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [customImages, setCustomImages] = useState<BreedImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchCustomImages();
  }, [breedId]);

  async function checkAdmin() {
    setIsChecking(true);
    try {
      // Use the same API endpoint as Navbar for consistent admin checking
      const response = await fetch("/api/admin/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(!!data.admin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setIsChecking(false);
    }
  }

  async function fetchCustomImages() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/breeds/images?breed_id=${breedId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomImages(data.images || []);
        
        // Notify parent of updated images
        if (data.images && data.images.length > 0 && onImagesUpdate) {
          onImagesUpdate(data.images.map((img: BreedImage) => img.image_url));
        }
      }
    } catch (error) {
      console.error("Error fetching custom images:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddImage() {
    if (!newImageUrl.trim()) return;
    
    if (customImages.length >= 3) {
      setError(lang === "el" 
        ? "Μέγιστο 3 εικόνες ανά ράτσα" 
        : "Maximum 3 images per breed");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError(lang === "el" ? "Δεν έχετε συνδεθεί" : "Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/breeds/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          breed_id: breedId,
          breed_type: breedType,
          image_url: newImageUrl.trim(),
          display_order: customImages.length,
        }),
      });

      if (response.ok) {
        setNewImageUrl("");
        await fetchCustomImages();
      } else {
        const data = await response.json();
        setError(data.error || (lang === "el" ? "Αποτυχία προσθήκης" : "Failed to add image"));
      }
    } catch (error) {
      console.error("Error adding image:", error);
      setError(lang === "el" ? "Αποτυχία προσθήκης" : "Failed to add image");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!confirm(lang === "el" 
      ? "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εικόνα;" 
      : "Are you sure you want to delete this image?")) {
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/breeds/images?id=${imageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchCustomImages();
      } else {
        setError(lang === "el" ? "Αποτυχία διαγραφής" : "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      setError(lang === "el" ? "Αποτυχία διαγραφής" : "Failed to delete image");
    } finally {
      setIsSaving(false);
    }
  }

  // Don't render anything if still checking or not admin
  if (isChecking || !isAdmin) return null;

  // Render edit button when not editing
  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="absolute right-2 top-2 z-10 rounded-full bg-card/90 p-2 shadow-md transition-colors duration-300 hover:bg-card hover:shadow-lg"
        title={lang === "el" ? "Επεξεργασία εικόνων" : "Edit images"}
      >
        <Pencil className="h-4 w-4 text-navy-soft" />
      </button>
    );
  }

  // Render editor panel when editing
  const displayImages = customImages.length > 0 
    ? customImages.map(img => ({ id: img.id, url: img.image_url, isCustom: true }))
    : defaultImages.map((url, idx) => ({ id: `default-${idx}`, url, isCustom: false }));

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-card/95 p-4 transition-colors duration-300">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {lang === "el" ? "Επεξεργασία Εικόνων" : "Edit Images"}
        </h4>
        <button
          onClick={() => {
            setIsEditing(false);
            setError(null);
          }}
          className="rounded-full p-1 text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors duration-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 rounded bg-red-100 px-2 py-1 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Current images */}
      <div className="mb-3 flex-1 overflow-auto">
        <p className="mb-2 text-xs text-foreground-muted">
          {customImages.length > 0 
            ? (lang === "el" ? "Προσαρμοσμένες εικόνες:" : "Custom images:")
            : (lang === "el" ? "Προεπιλεγμένες εικόνες:" : "Default images:")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {displayImages.map((img) => (
            <div
              key={img.id}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                img.isCustom ? "border-navy-soft" : "border-border"
              }`}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-contain bg-background-secondary"
                onError={(e) => {
                  e.currentTarget.src = "";
                  e.currentTarget.className = "hidden";
                }}
              />
              {img.isCustom && (
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={isSaving}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <span className={`absolute bottom-1 left-1 rounded px-1 py-0.5 text-[10px] text-white ${
                img.isCustom ? "bg-navy-soft" : "bg-black/50"
              }`}>
                {img.isCustom 
                  ? (lang === "el" ? "Προσ." : "Custom") 
                  : (lang === "el" ? "Προεπ." : "Default")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add new image */}
      {customImages.length < 3 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs text-foreground-muted">
            {lang === "el" ? "Προσθήκη νέας εικόνας:" : "Add new image:"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder={lang === "el" ? "URL εικόνας..." : "Image URL..."}
              className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-border transition-colors duration-300"
            />
            <button
              onClick={handleAddImage}
              disabled={isSaving || !newImageUrl.trim()}
              className="flex items-center gap-1 rounded-md bg-navy-soft px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 transition-colors duration-300"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-foreground-subtle">
            {lang === "el" 
              ? `${3 - customImages.length} θέση(εις) διαθέσιμη(ες)`
              : `${3 - customImages.length} slot(s) available`}
          </p>
        </div>
      )}
    </div>
  );
}
