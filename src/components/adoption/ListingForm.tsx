"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import type { AdoptionListingRow } from "@/app/api/adoptions/route";

type Props = {
  listing?: AdoptionListingRow;
  mode: "create" | "edit";
};

type FormData = {
  title: string;
  description: string;
  pet_name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  age_years: number;
  age_months: number;
  gender: "male" | "female" | "unknown" | "";
  size: "small" | "medium" | "large" | "";
  location_city: string;
  location_country: string;
  story: string;
  status: "available" | "pending" | "adopted";
};

export default function ListingForm({ listing, mode }: Props) {
  const router = useRouter();
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: listing?.title || "",
    description: listing?.description || "",
    pet_name: listing?.pet_name || "",
    species: listing?.species || "dog",
    breed: listing?.breed || "",
    age_years: listing?.age_years || 0,
    age_months: listing?.age_months || 0,
    gender: listing?.gender || "",
    size: listing?.size || "",
    location_city: listing?.location_city || "",
    location_country: listing?.location_country || "",
    story: listing?.story || "",
    status: listing?.status || "available",
  });

  const [images, setImages] = useState<{ id: string; image_url: string; display_order: number }[]>(
    listing?.images || []
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = {
    title: { en: "Listing Title", el: "Τίτλος Καταχώρησης" },
    titlePlaceholder: { en: "e.g., Friendly Labrador looking for a home", el: "π.χ., Φιλικό Λαμπραντόρ αναζητά σπίτι" },
    petName: { en: "Pet Name", el: "Όνομα Κατοικιδίου" },
    description: { en: "Description", el: "Περιγραφή" },
    descriptionPlaceholder: { en: "Describe the pet's personality, habits, and what makes them special...", el: "Περιγράψτε την προσωπικότητα, τις συνήθειες και τι κάνει αυτό το κατοικίδιο ξεχωριστό..." },
    species: { en: "Species", el: "Είδος" },
    breed: { en: "Breed", el: "Ράτσα" },
    breedPlaceholder: { en: "e.g., Labrador Retriever", el: "π.χ., Λαμπραντόρ Ρετρίβερ" },
    age: { en: "Age", el: "Ηλικία" },
    years: { en: "Years", el: "Έτη" },
    months: { en: "Months", el: "Μήνες" },
    gender: { en: "Gender", el: "Φύλο" },
    size: { en: "Size", el: "Μέγεθος" },
    location: { en: "Location", el: "Τοποθεσία" },
    city: { en: "City", el: "Πόλη" },
    country: { en: "Country", el: "Χώρα" },
    story: { en: "Story (optional)", el: "Ιστορία (προαιρετικό)" },
    storyPlaceholder: { en: "Tell their story - where they came from, what they've been through...", el: "Πείτε την ιστορία τους - από πού ήρθαν, τι έχουν περάσει..." },
    photos: { en: "Photos", el: "Φωτογραφίες" },
    addPhotos: { en: "Add photos", el: "Προσθήκη φωτογραφιών" },
    maxPhotos: { en: "Max 5 photos, up to 5MB each", el: "Μέγιστο 5 φωτογραφίες, έως 5MB η κάθε μία" },
    status: { en: "Status", el: "Κατάσταση" },
    submit: { en: mode === "create" ? "Create Listing" : "Save Changes", el: mode === "create" ? "Δημιουργία Καταχώρησης" : "Αποθήκευση Αλλαγών" },
    cancel: { en: "Cancel", el: "Ακύρωση" },
    required: { en: "Required field", el: "Υποχρεωτικό πεδίο" },
    uploading: { en: "Uploading...", el: "Μεταφόρτωση..." },
    submitting: { en: "Submitting...", el: "Υποβολή..." },
    dog: { en: "Dog", el: "Σκύλος" },
    cat: { en: "Cat", el: "Γάτα" },
    other: { en: "Other", el: "Άλλο" },
    male: { en: "Male", el: "Αρσενικό" },
    female: { en: "Female", el: "Θηλυκό" },
    unknown: { en: "Unknown", el: "Άγνωστο" },
    small: { en: "Small", el: "Μικρό" },
    medium: { en: "Medium", el: "Μεσαίο" },
    large: { en: "Large", el: "Μεγάλο" },
    available: { en: "Available", el: "Διαθέσιμο" },
    pending: { en: "Pending", el: "Σε αναμονή" },
    adopted: { en: "Adopted", el: "Υιοθετήθηκε" },
    select: { en: "Select", el: "Επιλέξτε" },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age_years" || name === "age_months" ? parseInt(value) || 0 : value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = images.length + newImages.length + files.length;
    
    if (totalImages > 5) {
      alert(lang === "el" ? "Μέγιστο 5 φωτογραφίες" : "Maximum 5 photos allowed");
      return;
    }

    setNewImages((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!listing) return;
    
    try {
      const response = await fetch(`/api/adoptions/${listing.id}/images?image_id=${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch (error) {
      console.error("Error removing image:", error);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (listingId: string) => {
    if (!newImages.length) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      newImages.forEach((file) => formData.append("images", file));

      const response = await fetch(`/api/adoptions/${listingId}/images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/adoptions" : `/api/adoptions/${listing?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save listing");
      }

      const data = await response.json();
      const listingId = data.listing.id;

      // Upload new images
      if (newImages.length > 0) {
        await uploadImages(listingId);
      }

      router.push(`/adoptions/${listingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalImages = images.length + newImages.length;
  const canAddMoreImages = totalImages < 5;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Pet Name & Title */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.petName[lang]} *
          </label>
          <input
            type="text"
            name="pet_name"
            value={formData.pet_name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.title[lang]} *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder={labels.titlePlaceholder[lang]}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
      </div>

      {/* Species & Breed */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.species[lang]} *
          </label>
          <select
            name="species"
            value={formData.species}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          >
            <option value="dog">{labels.dog[lang]}</option>
            <option value="cat">{labels.cat[lang]}</option>
            <option value="other">{labels.other[lang]}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.breed[lang]}
          </label>
          <input
            type="text"
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            placeholder={labels.breedPlaceholder[lang]}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
      </div>

      {/* Age, Gender, Size */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.years[lang]}
          </label>
          <input
            type="number"
            name="age_years"
            value={formData.age_years}
            onChange={handleChange}
            min="0"
            max="30"
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.months[lang]}
          </label>
          <input
            type="number"
            name="age_months"
            value={formData.age_months}
            onChange={handleChange}
            min="0"
            max="11"
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.gender[lang]}
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          >
            <option value="">{labels.select[lang]}</option>
            <option value="male">{labels.male[lang]}</option>
            <option value="female">{labels.female[lang]}</option>
            <option value="unknown">{labels.unknown[lang]}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.size[lang]}
          </label>
          <select
            name="size"
            value={formData.size}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          >
            <option value="">{labels.select[lang]}</option>
            <option value="small">{labels.small[lang]}</option>
            <option value="medium">{labels.medium[lang]}</option>
            <option value="large">{labels.large[lang]}</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.city[lang]}
          </label>
          <input
            type="text"
            name="location_city"
            value={formData.location_city}
            onChange={handleChange}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.country[lang]}
          </label>
          <input
            type="text"
            name="location_country"
            value={formData.location_country}
            onChange={handleChange}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {labels.description[lang]} *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder={labels.descriptionPlaceholder[lang]}
          className="w-full resize-none rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
        />
      </div>

      {/* Story */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {labels.story[lang]}
        </label>
        <textarea
          name="story"
          value={formData.story}
          onChange={handleChange}
          rows={3}
          placeholder={labels.storyPlaceholder[lang]}
          className="w-full resize-none rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
        />
      </div>

      {/* Status (edit mode only) */}
      {mode === "edit" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.status[lang]}
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
          >
            <option value="available">{labels.available[lang]}</option>
            <option value="pending">{labels.pending[lang]}</option>
            <option value="adopted">{labels.adopted[lang]}</option>
          </select>
        </div>
      )}

      {/* Photos */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {labels.photos[lang]}
        </label>
        <p className="mb-3 text-sm text-foreground-muted">{labels.maxPhotos[lang]}</p>
        
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {/* Existing images */}
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(img.id)}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* New images */}
          {newImages.map((file, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveNewImage(index)}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add button */}
          {canAddMoreImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-foreground-subtle transition-colors duration-300 hover:border-navy-soft hover:text-navy-soft"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="mt-1 text-xs">{labels.addPhotos[lang]}</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Submit buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary"
        >
          {labels.cancel[lang]}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-soft px-6 py-3 font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90 disabled:opacity-50"
        >
          {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {isUploading ? labels.uploading[lang] : isSubmitting ? labels.submitting[lang] : labels.submit[lang]}
        </button>
      </div>
    </form>
  );
}
