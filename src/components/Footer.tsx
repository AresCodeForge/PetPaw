"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-background-secondary transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center">
              <Image
                src="/logo.png?v=2"
                alt="Pet-Paw"
                width={180}
                height={54}
                className="h-[clamp(1.75rem,5vw,3rem)] w-auto min-h-[1.75rem] dark:brightness-110"
                unoptimized
              />
            </div>
            <p className="text-sm text-foreground-muted">
              {t("footer_tagline")}
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("footer_product")}
            </h3>
            <ul className="space-y-2 text-sm text-foreground-muted">
              <li><Link href="/how-it-works" className="transition-colors hover:text-navy-soft">{t("footer_seeHow")}</Link></li>
              <li><Link href="/pricing" className="transition-colors hover:text-navy-soft">{t("footer_prices")}</Link></li>
              <li><Link href="/get-qr-tag" className="transition-colors hover:text-navy-soft">{t("footer_getTag")}</Link></li>
              <li><Link href="/faq" className="transition-colors hover:text-navy-soft">{t("footer_faq")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("footer_company")}
            </h3>
            <ul className="space-y-2 text-sm text-foreground-muted">
              <li><Link href="/about" className="transition-colors hover:text-navy-soft">{t("footer_about")}</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-navy-soft">{t("footer_contact")}</Link></li>
              <li><Link href="/blog" className="transition-colors hover:text-navy-soft">{t("footer_blog")}</Link></li>
              <li><Link href="/press" className="transition-colors hover:text-navy-soft">{t("footer_press")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("footer_legal")}
            </h3>
            <ul className="space-y-2 text-sm text-foreground-muted">
              <li><Link href="/terms" className="transition-colors hover:text-navy-soft">{t("footer_terms")}</Link></li>
              <li><Link href="/privacy" className="transition-colors hover:text-navy-soft">{t("footer_privacy")}</Link></li>
              <li><Link href="/shipping-returns" className="transition-colors hover:text-navy-soft">{t("footer_shipping")}</Link></li>
              <li><Link href="/accessibility" className="transition-colors hover:text-navy-soft">{t("footer_accessibility")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-8 transition-colors duration-300">
          <p className="text-xs text-foreground-subtle">{t("footer_disclaimer")}</p>
          <p className="mt-4 text-xs text-foreground-subtle">© {new Date().getFullYear()} PetPaw. {t("footer_copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
