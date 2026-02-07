"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFlagUrl, type Breed } from "@/lib/breeds";
import { supabase } from "@/lib/supabase";
import CharacteristicBar from "@/components/encyclopedia/CharacteristicBar";
import BreedCard from "@/components/encyclopedia/BreedCard";
import BreedImageEditor from "@/components/encyclopedia/BreedImageEditor";
import EditableField from "@/components/encyclopedia/EditableField";

type Props = {
  breed: Breed;
  relatedBreeds: Breed[];
};

export default function BreedDetailClient({ breed, relatedBreeds }: Props) {
  const { lang, t } = useLanguage();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [displayImages, setDisplayImages] = useState<string[]>(breed.images || []);
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch custom images, overrides, and check admin on mount
  useEffect(() => {
    async function fetchCustomImages() {
      try {
        const response = await fetch(`/api/breeds/images?breed_id=${breed.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            setDisplayImages(data.images.map((img: { image_url: string }) => img.image_url));
            setActiveImageIndex(0);
          }
        }
      } catch (error) {
        console.error("Error fetching custom images:", error);
      }
    }

    async function fetchOverrides() {
      try {
        const response = await fetch(`/api/breeds/overrides?breed_id=${breed.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.overrides && Object.keys(data.overrides).length > 0) {
            setOverrides(data.overrides);
          }
        }
      } catch (error) {
        console.error("Error fetching breed overrides:", error);
      }
    }

    async function checkAdmin() {
      try {
        const response = await fetch("/api/admin/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(!!data.admin);
        }
      } catch {
        setIsAdmin(false);
      }
    }

    fetchCustomImages();
    fetchOverrides();
    checkAdmin();
  }, [breed.id]);

  const handleImagesUpdate = (newImages: string[]) => {
    if (newImages.length > 0) {
      setDisplayImages(newImages);
      setActiveImageIndex(0);
    } else {
      setDisplayImages(breed.images || []);
    }
  };

  // Merge static breed data with overrides
  const effectiveBreed = useMemo(() => {
    const merged = { ...breed };

    for (const [key, value] of Object.entries(overrides)) {
      if (key === "characteristics" && typeof value === "object" && value !== null) {
        merged.characteristics = {
          ...merged.characteristics,
          ...(value as Partial<Breed["characteristics"]>),
        };
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return merged as Breed;
  }, [breed, overrides]);

  // Save a field override via API
  const handleFieldSave = useCallback(
    async (field: string, value: string | number | string[]): Promise<boolean> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return false;

        const response = await fetch("/api/admin/breeds/overrides", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            breed_id: breed.id,
            field,
            value,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setOverrides(data.overrides || {});
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error saving override:", error);
        return false;
      }
    },
    [breed.id]
  );

  const name = lang === "el" ? effectiveBreed.name_el : effectiveBreed.name_en;
  const description = lang === "el" ? effectiveBreed.description_el : effectiveBreed.description_en;
  const temperaments = lang === "el" ? effectiveBreed.temperament_el : effectiveBreed.temperament_en;
  const care = lang === "el" ? effectiveBreed.care_el : effectiveBreed.care_en;
  const health = lang === "el" ? effectiveBreed.health_el : effectiveBreed.health_en;

  const sizeLabels: Record<string, string> = {
    small: lang === "el" ? "Μικρό" : "Small",
    medium: lang === "el" ? "Μεσαίο" : "Medium",
    large: lang === "el" ? "Μεγάλο" : "Large",
    giant: lang === "el" ? "Γίγαντας" : "Giant",
  };

  const sizeOptions = [
    { value: "small", label: lang === "el" ? "Μικρό" : "Small" },
    { value: "medium", label: lang === "el" ? "Μεσαίο" : "Medium" },
    { value: "large", label: lang === "el" ? "Μεγάλο" : "Large" },
    { value: "giant", label: lang === "el" ? "Γίγαντας" : "Giant" },
  ];

  const characteristicLabels = {
    energy: lang === "el" ? "Ενέργεια" : "Energy",
    grooming: lang === "el" ? "Περιποίηση" : "Grooming",
    friendliness: lang === "el" ? "Φιλικότητα" : "Friendliness",
    trainability: lang === "el" ? "Εκπαιδευσιμότητα" : "Trainability",
    cost: lang === "el" ? "Κόστος Συντήρησης" : "Pet Cost",
  };

  const typeIcon = breed.type === "dog" ? "🐕" : "🐈";
  const images = displayImages;
  const activeImage = images[activeImageIndex] || images[0];

  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/encyclopedia"
          className="mb-6 inline-flex items-center gap-2 text-sm text-navy-soft hover:opacity-80 transition-colors duration-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {lang === "el" ? "Πίσω στην Εγκυκλοπαίδεια" : "Back to Encyclopedia"}
        </Link>

        {/* Hero Section */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-colors duration-300">
          <div className="grid md:grid-cols-2">
            {/* Image Gallery */}
            <div className="relative bg-background-secondary">
              {/* Admin Edit Button */}
              <BreedImageEditor
                breedId={breed.id}
                breedType={breed.type}
                defaultImages={breed.images || []}
                onImagesUpdate={handleImagesUpdate}
              />
              
              {/* Main Image */}
              <div className="aspect-square flex items-center justify-center p-4">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={`${name} - ${lang === "el" ? "Φωτογραφία" : "Photo"} ${activeImageIndex + 1}`}
                    className="max-h-full max-w-full object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`flex h-full w-full items-center justify-center ${activeImage ? "hidden" : ""}`}>
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-border">
                      <span className="text-5xl">{typeIcon}</span>
                    </div>
                    <span className="text-lg text-foreground-subtle">{name}</span>
                  </div>
                </div>
              </div>
              
              {/* Thumbnail Navigation */}
              {images.length > 1 && (
                <div className="flex justify-center gap-2 p-4 pt-0">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                        index === activeImageIndex
                          ? "border-navy-soft ring-2 ring-border"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${name} ${index + 1}`}
                        className="h-full w-full object-contain bg-card"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="p-6 md:p-8">
              {/* Type Badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  breed.type === "dog" 
                    ? "bg-navy-soft/10 text-navy-soft"
                    : "bg-[#8b5cf6]/10 text-[#8b5cf6]"
                }`}>
                  {typeIcon}
                  {breed.type === "dog" ? (lang === "el" ? "Σκύλος" : "Dog") : (lang === "el" ? "Γάτα" : "Cat")}
                </span>
                <EditableField
                  breedId={breed.id}
                  fieldName="size"
                  currentValue={effectiveBreed.size}
                  fieldType="select"
                  selectOptions={sizeOptions}
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={lang === "el" ? "Μέγεθος" : "Size"}
                >
                  <span className="rounded-full bg-background-secondary px-3 py-1 text-sm font-medium text-foreground-muted">
                    {sizeLabels[effectiveBreed.size]}
                  </span>
                </EditableField>
              </div>

              {/* Name */}
              <EditableField
                breedId={breed.id}
                fieldName="name_en"
                currentValue={effectiveBreed.name_en}
                fieldType="short"
                isAdmin={isAdmin}
                lang={lang}
                onSave={handleFieldSave}
                label={lang === "el" ? "Όνομα" : "Name"}
                pairedField={{
                  fieldName: "name_el",
                  currentValue: effectiveBreed.name_el,
                  label: "Ελληνικά",
                }}
              >
                <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
                  {name}
                </h1>
              </EditableField>

              {/* Origin with flag */}
              <EditableField
                breedId={breed.id}
                fieldName="origin"
                currentValue={effectiveBreed.origin}
                fieldType="short"
                isAdmin={isAdmin}
                lang={lang}
                onSave={handleFieldSave}
                label={lang === "el" ? "Καταγωγή" : "Origin"}
              >
                <p className="mb-4 flex items-center gap-2 text-lg text-foreground-muted">
                  {lang === "el" ? "Καταγωγή" : "Origin"}: 
                  <img 
                    src={getFlagUrl(effectiveBreed.originCode)} 
                    alt={effectiveBreed.origin}
                    className="h-5 w-6 rounded object-cover shadow-sm"
                  />
                  {effectiveBreed.origin}
                </p>
              </EditableField>

              {/* Quick Stats */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <EditableField
                  breedId={breed.id}
                  fieldName="lifespan"
                  currentValue={effectiveBreed.lifespan}
                  fieldType="short"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={lang === "el" ? "Προσδόκιμο ζωής" : "Lifespan"}
                >
                  <div className="rounded-xl bg-background-secondary p-4 transition-colors duration-300">
                    <p className="text-sm text-foreground-muted">
                      {lang === "el" ? "Προσδόκιμο ζωής" : "Lifespan"}
                    </p>
                    <p className="text-lg font-semibold text-foreground">{effectiveBreed.lifespan}</p>
                  </div>
                </EditableField>
                <div className="rounded-xl bg-background-secondary p-4 transition-colors duration-300">
                  <p className="text-sm text-foreground-muted">
                    {lang === "el" ? "Μέγεθος" : "Size"}
                  </p>
                  <p className="text-lg font-semibold text-foreground">{sizeLabels[effectiveBreed.size]}</p>
                </div>
              </div>

              {/* Temperament Tags */}
              <EditableField
                breedId={breed.id}
                fieldName="temperament_en"
                currentValue={effectiveBreed.temperament_en}
                fieldType="tags"
                isAdmin={isAdmin}
                lang={lang}
                onSave={handleFieldSave}
                label={lang === "el" ? "Ιδιοσυγκρασία" : "Temperament"}
                pairedField={{
                  fieldName: "temperament_el",
                  currentValue: effectiveBreed.temperament_el,
                  label: "Ελληνικά",
                }}
              >
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-foreground-muted">
                    {lang === "el" ? "Ιδιοσυγκρασία" : "Temperament"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {temperaments.map((temp, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-mint/20 px-3 py-1 text-sm font-medium text-foreground"
                      >
                        {temp}
                      </span>
                    ))}
                  </div>
                </div>
              </EditableField>

              {/* Characteristics */}
              <div className="space-y-3">
                <EditableField
                  breedId={breed.id}
                  fieldName="characteristics.energy"
                  currentValue={effectiveBreed.characteristics.energy}
                  fieldType="number"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={characteristicLabels.energy}
                >
                  <CharacteristicBar
                    label={characteristicLabels.energy}
                    value={effectiveBreed.characteristics.energy}
                    color="amber"
                  />
                </EditableField>
                <EditableField
                  breedId={breed.id}
                  fieldName="characteristics.grooming"
                  currentValue={effectiveBreed.characteristics.grooming}
                  fieldType="number"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={characteristicLabels.grooming}
                >
                  <CharacteristicBar
                    label={characteristicLabels.grooming}
                    value={effectiveBreed.characteristics.grooming}
                    color="purple"
                  />
                </EditableField>
                <EditableField
                  breedId={breed.id}
                  fieldName="characteristics.friendliness"
                  currentValue={effectiveBreed.characteristics.friendliness}
                  fieldType="number"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={characteristicLabels.friendliness}
                >
                  <CharacteristicBar
                    label={characteristicLabels.friendliness}
                    value={effectiveBreed.characteristics.friendliness}
                    color="green"
                  />
                </EditableField>
                <EditableField
                  breedId={breed.id}
                  fieldName="characteristics.trainability"
                  currentValue={effectiveBreed.characteristics.trainability}
                  fieldType="number"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={characteristicLabels.trainability}
                >
                  <CharacteristicBar
                    label={characteristicLabels.trainability}
                    value={effectiveBreed.characteristics.trainability}
                    color="blue"
                  />
                </EditableField>
                <EditableField
                  breedId={breed.id}
                  fieldName="characteristics.cost_index"
                  currentValue={effectiveBreed.characteristics.cost_index}
                  fieldType="number"
                  isAdmin={isAdmin}
                  lang={lang}
                  onSave={handleFieldSave}
                  label={characteristicLabels.cost}
                >
                  <CharacteristicBar
                    label={characteristicLabels.cost}
                    value={effectiveBreed.characteristics.cost_index}
                    color="rose"
                    annotation={`${lang === "el" ? "Εκτ." : "Est."} ~${effectiveBreed.cost_annual_usd}/${lang === "el" ? "έτος" : "year"}`}
                  />
                </EditableField>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* About */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2 transition-colors duration-300">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <svg className="h-6 w-6 text-navy-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === "el" ? "Σχετικά" : "About"}
            </h2>
            <EditableField
              breedId={breed.id}
              fieldName="description_en"
              currentValue={effectiveBreed.description_en}
              fieldType="text"
              isAdmin={isAdmin}
              lang={lang}
              onSave={handleFieldSave}
              label={lang === "el" ? "Περιγραφή" : "Description"}
              pairedField={{
                fieldName: "description_el",
                currentValue: effectiveBreed.description_el,
                label: "Ελληνικά",
              }}
            >
              <p className="text-foreground-muted leading-relaxed">{description}</p>
            </EditableField>
          </div>

          {/* Care */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <svg className="h-6 w-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {lang === "el" ? "Φροντίδα" : "Care Tips"}
            </h2>
            <EditableField
              breedId={breed.id}
              fieldName="care_en"
              currentValue={effectiveBreed.care_en}
              fieldType="text"
              isAdmin={isAdmin}
              lang={lang}
              onSave={handleFieldSave}
              label={lang === "el" ? "Φροντίδα" : "Care"}
              pairedField={{
                fieldName: "care_el",
                currentValue: effectiveBreed.care_el,
                label: "Ελληνικά",
              }}
            >
              <p className="text-foreground-muted leading-relaxed">{care}</p>
            </EditableField>
          </div>

          {/* Health */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <svg className="h-6 w-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === "el" ? "Υγεία" : "Health Considerations"}
            </h2>
            <EditableField
              breedId={breed.id}
              fieldName="health_en"
              currentValue={effectiveBreed.health_en}
              fieldType="text"
              isAdmin={isAdmin}
              lang={lang}
              onSave={handleFieldSave}
              label={lang === "el" ? "Υγεία" : "Health"}
              pairedField={{
                fieldName: "health_el",
                currentValue: effectiveBreed.health_el,
                label: "Ελληνικά",
              }}
            >
              <p className="text-foreground-muted leading-relaxed">{health}</p>
            </EditableField>
          </div>
        </div>

        {/* Related Breeds */}
        {relatedBreeds.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              {lang === "el" ? "Σχετικές Ράτσες" : "Related Breeds"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedBreeds.map((relatedBreed) => (
                <BreedCard key={relatedBreed.id} breed={relatedBreed} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 rounded-xl border border-navy-soft/30 bg-navy-soft/5 p-4 transition-colors duration-300">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-navy-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-left text-sm text-navy-soft">
              {t("encyclopedia_disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
