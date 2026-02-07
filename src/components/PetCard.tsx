"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Edit, QrCode, BookOpen, ExternalLink } from "lucide-react";

export interface PetCardData {
  id: string;
  name: string;
  type: string;
  age?: number | null;
  description?: string | null;
  image_url?: string | null;
  qr_code_id?: string | null;
  qr_code_data?: string | null;
  is_lost?: boolean;
}

interface PetCardProps {
  pet: PetCardData;
  publicUrl: string;
  showActions?: boolean;
  /** When false (free tier), journal link and lost badge are hidden. */
  isPro?: boolean;
}

export default function PetCard({ pet, publicUrl, showActions = true, isPro = false }: PetCardProps) {
  const { t } = useLanguage();
  const typeLabel = t("petType_" + pet.type) !== "petType_" + pet.type ? t("petType_" + pet.type) : pet.type;
  const ageText = pet.age != null && pet.age !== undefined
    ? `${pet.age} ${pet.age === 1 ? t("common_year") : t("common_years")}`
    : null;

  const petTypeIcon = pet.type === "dog" ? "🐕" : pet.type === "cat" ? "🐈" : "🐾";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-navy-soft/30">
      {/* Image - aspect-[4/3] to match other cards */}
      <Link href={`/dashboard/pets/${pet.id}/edit`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-background-secondary">
          {pet.image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pet.image_url}
                alt={pet.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-foreground-subtle">
              {petTypeIcon}
            </div>
          )}
          
          {/* Lost badge overlay */}
          {isPro && pet.is_lost && (
            <div className="absolute left-2 top-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                {t("petCard_lost")}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content - p-4 to match other cards */}
      <div className="p-4">
        {/* Type badge */}
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-0.5 text-xs font-medium text-foreground">
            {petTypeIcon} {typeLabel}
          </span>
          {ageText && (
            <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {ageText}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/dashboard/pets/${pet.id}/edit`}>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-navy-soft transition-colors duration-300">
            {pet.name}
          </h3>
        </Link>

        {/* Description */}
        {pet.description && (
          <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
            {pet.description}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3">
            <Link
              href={`/dashboard/pets/${pet.id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky/10 text-sky transition-colors hover:bg-sky/20"
              title={t("petCard_view")}
            >
              <Edit className="h-4 w-4" />
            </Link>
            <Link
              href={publicUrl}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/10 text-mint transition-colors hover:bg-mint/20"
              title={t("petCard_publicProfile")}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href={`/dashboard/pets/${pet.id}/claim-qr`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-soft/10 text-navy-soft transition-colors hover:bg-navy-soft/20"
              title={t("petCard_claimQr")}
            >
              <QrCode className="h-4 w-4" />
            </Link>
            {isPro && (
              <Link
                href={`/dashboard/pets/${pet.id}/journal`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316] transition-colors hover:bg-[#f97316]/20"
                title={t("petCard_journal")}
              >
                <BookOpen className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
