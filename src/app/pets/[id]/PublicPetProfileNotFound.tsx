"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PublicPetProfileNotFound() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        {t("publicProfile_petNotFound")}
      </h1>
      <p className="mt-4 text-foreground-muted">
        {t("publicProfile_profileRemoved")}
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-navy-soft font-semibold hover:underline transition-colors duration-300"
      >
        {t("publicProfile_goHome")}
      </Link>
    </div>
  );
}
