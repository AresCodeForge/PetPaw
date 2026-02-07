"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

type Status = "not_found" | "unclaimed";

export default function RCodeClient({
  status,
  code,
}: {
  status: Status;
  code?: string;
}) {
  const { t } = useLanguage();

  if (status === "not_found") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("rCode_notFound")}</h1>
        <p className="mt-4 text-foreground-muted">
          {t("rCode_invalid")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-navy-soft font-semibold hover:underline transition-colors duration-300"
        >
          {t("rCode_goHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center transition-colors duration-300">
        <h1 className="text-2xl font-bold text-foreground">{t("rCode_activateTitle")}</h1>
        <p className="mt-4 text-foreground-muted">
          {t("rCode_activateDesc")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <AnimatedButton href={`/login?redirect=${encodeURIComponent(`/dashboard/add-pet?claim=${code ?? ""}`)}`} variant="primary">
            {t("rCode_login")}
          </AnimatedButton>
          <AnimatedButton href={`/get-qr-tag?claim=${code ?? ""}`} variant="sky">
            {t("rCode_register")}
          </AnimatedButton>
        </div>
        <p className="mt-6 text-sm text-foreground-subtle">
          {t("rCode_hasAccount")}{" "}
          <Link href={`/login?redirect=${encodeURIComponent(`/dashboard/add-pet?claim=${code ?? ""}`)}`} className="text-navy-soft hover:underline transition-colors duration-300">
            {t("rCode_loginAndClaim")}
          </Link>
        </p>
      </div>
    </div>
  );
}
