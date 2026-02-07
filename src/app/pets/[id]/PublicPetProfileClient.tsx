"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { isValidPhone } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

export interface PublicPetProfilePetData {
  type: string;
  age?: number | null;
  description?: string | null;
  medication_notes?: string | null;
}

interface PublicPetProfileClientProps {
  petId: string;
  /** The owner's user ID - used to check if current viewer is the owner */
  ownerId?: string;
  imageUrls: string[];
  primaryImage: string | null;
  petName: string;
  /** When true, show "I found this pet" and allow reporting. Owner must mark pet as lost in edit. */
  isLost?: boolean;
  /** When provided, profile content (type, age, description, medication) is rendered here with i18n. Otherwise use children. */
  pet?: PublicPetProfilePetData | null;
  children?: React.ReactNode;
}

export default function PublicPetProfileClient({
  petId,
  ownerId,
  imageUrls,
  primaryImage,
  petName,
  isLost = false,
  pet,
  children,
}: PublicPetProfileClientProps) {
  const { t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Check if current user is the owner
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    checkUser();
  }, []);

  const isOwner = currentUserId && ownerId && currentUserId === ownerId;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showFoundForm, setShowFoundForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const allImages = primaryImage ? [primaryImage, ...imageUrls.filter((u) => u !== primaryImage)] : imageUrls;

  const handleSubmitFound = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    if (!isValidPhone(trimmed)) {
      setError(t("publicProfile_invalidPhone"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/report-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id: petId, phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || t("publicProfile_failSend");
        const extra = data.details ? ` (${data.details})` : "";
        setError(msg + extra);
        setSubmitting(false);
        return;
      }
      setConfirmSent(true);
      setPhone("");
    } catch {
      setError(t("publicProfile_networkError"));
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-colors duration-300">
        {primaryImage ? (
          <button
            type="button"
            onClick={() => setLightboxUrl(primaryImage)}
            className="relative mx-auto block aspect-square max-w-48 overflow-hidden rounded-xl bg-background-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-mint transition-colors duration-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImage}
              alt={petName}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-border text-6xl">
            🐾
          </div>
        )}
        {allImages.length > 1 && (
          <div className="mt-3 flex justify-center gap-2 flex-wrap">
            {allImages.slice(0, 3).map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxUrl(url)}
                className="h-14 w-14 overflow-hidden rounded-lg border border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-mint transition-colors duration-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {pet != null ? (
          <>
            <h1 className="mt-6 text-3xl font-bold text-foreground">{petName}</h1>
            <p className="mt-2 text-foreground-muted">
              {(() => { const k = `petType_${pet.type}`; const label = t(k); return label === k ? pet.type : label; })()}
              {pet.age != null && pet.age !== undefined && (
                <> • {pet.age} {pet.age === 1 ? t("common_year") : t("common_years")}</>
              )}
            </p>
            {pet.description && (
              <p className="mt-4 text-foreground-muted">{pet.description}</p>
            )}
            {pet.medication_notes && (
              <div className="mt-4 rounded-xl bg-background-secondary p-4 transition-colors duration-300">
                <p className="text-sm font-medium text-foreground">{t("publicProfile_medicationLabel")}</p>
                <p className="mt-1 text-foreground-muted">{pet.medication_notes}</p>
              </div>
            )}
          </>
        ) : (
          children
        )}

        {/* Only show hint if viewer is NOT the owner */}
        {!isOwner && (
          <p className="mt-8 text-center text-sm text-foreground-subtle">
            {t("publicProfile_signInHint")}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {isLost && (
            <AnimatedButton variant="orange" onClick={() => setShowFoundForm(true)}>
              {t("publicProfile_lost")}
            </AnimatedButton>
          )}
          <AnimatedButton href="/dashboard" variant="sky">
            {t("publicProfile_back")}
          </AnimatedButton>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t("publicProfile_lightboxAlt")}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-card/90 p-2 text-foreground hover:bg-card transition-colors duration-300"
            aria-label={t("common_close")}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt={petName}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Χάθηκα! form modal */}
      {showFoundForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="found-form-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="found-form-title" className="text-xl font-bold text-foreground">
              {t("publicProfile_foundTitle")}
            </h2>
            {!confirmSent ? (
              <>
                <p className="mt-2 text-foreground-muted">{t("publicProfile_foundDesc")}</p>
                <form onSubmit={handleSubmitFound} className="mt-4">
                  <Input
                    id="report-phone"
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("publicProfile_phonePlaceholder")}
                    label={t("publicProfile_phone")}
                    required
                    state={error ? "error" : "default"}
                    errorText={error}
                    icon={
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center rounded-full bg-mint px-5 py-2.5 font-semibold text-foreground hover:bg-mint-hover disabled:opacity-60 transition-colors duration-300"
                    >
                      {submitting ? t("common_sending") : t("common_submit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowFoundForm(false); setError(""); setConfirmSent(false); }}
                      className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 font-medium text-foreground-muted hover:bg-background-secondary transition-colors duration-300"
                    >
                      {t("common_cancel")}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="mt-2 text-foreground-muted">
                  {t("publicProfile_thanks")}
                </p>
                <button
                  type="button"
                  onClick={() => { setShowFoundForm(false); setConfirmSent(false); }}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-mint px-5 py-2.5 font-semibold text-foreground hover:bg-mint-hover transition-colors duration-300"
                >
                  {t("common_close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
