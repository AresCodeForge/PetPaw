"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import AdminQrBatchClient from "./AdminQrBatchClient";

export default function AdminPageHeader() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("adminPage_title")}</h1>
      <p className="mt-2 text-foreground-muted">
        {t("adminPage_desc")}
      </p>
      <AdminQrBatchClient />
    </div>
  );
}
