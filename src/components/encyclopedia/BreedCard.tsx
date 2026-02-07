"use client";

import Link from "next/link";
import { getFlagUrl, type Breed } from "@/lib/breeds";

type Props = {
  breed: Breed;
  lang: string;
};

export default function BreedCard({ breed, lang }: Props) {
  const name = lang === "el" ? breed.name_el : breed.name_en;
  const temperaments = lang === "el" ? breed.temperament_el : breed.temperament_en;
  const primaryImage = breed.images?.[0];
  
  const sizeLabels = {
    small: lang === "el" ? "Μικρό" : "Small",
    medium: lang === "el" ? "Μεσαίο" : "Medium",
    large: lang === "el" ? "Μεγάλο" : "Large",
    giant: lang === "el" ? "Γίγαντας" : "Giant",
  };

  const typeIcon = breed.type === "dog" ? (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 4a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4h-1.5l-.5 2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4l-.5-2H8a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2h12z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C9.243 2 7 4.243 7 7c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.757-2.243-5-5-5zM5 7c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1zm12 0c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1zM4 10c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zm16 0c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zM12 14c-4.418 0-8 2.686-8 6v2h16v-2c0-3.314-3.582-6-8-6z" />
    </svg>
  );

  return (
    <Link
      href={`/encyclopedia/breeds/${breed.slug}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-300 hover:shadow-md hover:border-navy-soft/30"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-background-secondary flex items-center justify-center">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={name}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`flex h-full w-full items-center justify-center ${primaryImage ? "hidden" : ""}`}>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-border">
              {typeIcon}
            </div>
            <span className="text-sm text-foreground-subtle">{name}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Type & Size badges */}
        <div className="mb-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            breed.type === "dog" 
? "bg-navy-soft/10 text-navy-soft"
              : "bg-[#8b5cf6]/10 text-[#8b5cf6]"
          }`}>
            {typeIcon}
            {breed.type === "dog" ? (lang === "el" ? "Σκύλος" : "Dog") : (lang === "el" ? "Γάτα" : "Cat")}
          </span>
          <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs font-medium text-foreground-muted">
            {sizeLabels[breed.size]}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-navy-soft transition-colors duration-300">
          {name}
        </h3>

        {/* Origin with flag */}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
          <img 
            src={getFlagUrl(breed.originCode)} 
            alt={breed.origin}
            className="h-4 w-5 rounded-sm object-cover shadow-sm"
          />
          {breed.origin}
        </p>

        {/* Temperament tags - single line with overflow hidden */}
        <div className="mt-3 flex gap-1 overflow-hidden h-6">
          {temperaments.slice(0, 2).map((temp, index) => (
            <span
              key={index}
              className="shrink-0 rounded-full bg-mint/10 px-2 py-0.5 text-xs text-foreground"
            >
              {temp}
            </span>
          ))}
          {temperaments.length > 2 && (
            <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-xs text-foreground-muted">
              +{temperaments.length - 2}
            </span>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <span title={lang === "el" ? "Ενέργεια" : "Energy"}>
              ⚡ {breed.characteristics.energy}/5
            </span>
            <span title={lang === "el" ? "Περιποίηση" : "Grooming"}>
              ✂️ {breed.characteristics.grooming}/5
            </span>
            <span title={lang === "el" ? "Κόστος" : "Cost"}>
              💰 {breed.characteristics.cost_index}/5
            </span>
          </div>
          <span className="text-xs text-foreground-muted">{breed.lifespan}</span>
        </div>
      </div>
    </Link>
  );
}
