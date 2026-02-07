"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function AccessDenied() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">{t("adminPage_noAccess")}</h1>
      <p className="mt-4 text-foreground-muted">{t("adminPage_adminOnly")}</p>
    </div>
  );
}
