"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

export default function HowItWorksPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 transition-colors duration-300">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t("how_h1")}</h1>
      <p className="mt-4 text-lg text-foreground-muted">
        {t("how_intro")}
      </p>
      <div className="mt-12 space-y-10">
        <section>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t("how_s1_title")}
          </h2>
          <p className="mt-2 text-foreground-muted">
            {t("how_s1_p")}
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t("how_s2_title")}
          </h2>
          <p className="mt-2 text-foreground-muted">
            {t("how_s2_p")}
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t("how_s3_title")}
          </h2>
          <p className="mt-2 text-foreground-muted">
            {t("how_s3_p")}
          </p>
        </section>
      </div>
      <div className="mt-12">
        <AnimatedButton href="/get-qr-tag" variant="primary" size="lg">
          {t("how_getTag")}
        </AnimatedButton>
      </div>
    </div>
  );
}
