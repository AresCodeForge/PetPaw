"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import AnimatedButton from "@/components/AnimatedButton";
import { Check, X } from "lucide-react";

const PRO_PRICE = 1.5; // Monthly Pro subscription price

export default function PricingPage() {
  const { t, lang } = useLanguage();
  const { addItem } = useCart();

  const handleAddProToCart = () => {
    addItem({
      type: "pro_subscription",
      name: t("cart_proSubscription"),
      price: PRO_PRICE,
      quantity: 1,
    });
  };

  // Feature lists for comparison
  const freeFeatures = [
    { key: "unlimited_pets", included: true },
    { key: "unlimited_qr", included: true, note: lang === "el" ? "(Χρεώνονται/Παραγγέλλονται Ξεχωριστά)" : "(Charged/Ordered Separately)" },
    { key: "basic_info", included: true },
    { key: "dashboard", included: true },
    { key: "photos", included: true },
  ];

  const proOnlyFeatures = [
    { key: "medical", included: false },
    { key: "medication", included: false },
    { key: "vaccinations", included: false },
    { key: "vet", included: false },
    { key: "diet", included: false },
    { key: "lost", included: false },
    { key: "calendar", included: false },
  ];

  const allProFeatures = [
    { key: "unlimited_pets", included: true },
    { key: "unlimited_qr", included: true, note: lang === "el" ? "(Χρεώνονται/Παραγγέλλονται Ξεχωριστά)" : "(Charged/Ordered Separately)" },
    { key: "basic_info", included: true },
    { key: "dashboard", included: true },
    { key: "photos", included: true },
    { key: "medical", included: true },
    { key: "medication", included: true },
    { key: "vaccinations", included: true },
    { key: "vet", included: true },
    { key: "diet", included: true },
    { key: "lost", included: true },
    { key: "calendar", included: true },
  ];

  const getFeatureLabel = (key: string) => {
    const labels: Record<string, { en: string; el: string }> = {
      unlimited_pets: { en: "Unlimited pets", el: "Απεριόριστα κατοικίδια" },
      unlimited_qr: { en: "Unlimited QR tags", el: "Απεριόριστες ετικέτες QR" },
      basic_info: { en: "Basic pet info", el: "Βασικές πληροφορίες κατοικιδίου" },
      dashboard: { en: "Pet dashboard", el: "Πίνακας ελέγχου κατοικιδίων" },
      photos: { en: "Photo gallery", el: "Γκαλερί φωτογραφιών" },
      medical: { en: "Medical records", el: "Ιατρικό ιστορικό" },
      medication: { en: "Medication tracking", el: "Παρακολούθηση φαρμακευτικής αγωγής" },
      vaccinations: { en: "Vaccination history", el: "Ιστορικό εμβολίων" },
      vet: { en: "Vet visits log", el: "Αρχείο επισκέψεων σε κτηνίατρο" },
      diet: { en: "Diet & nutrition", el: "Διατροφή" },
      lost: { en: "Lost pet alerts", el: "Ειδοποιήσεις χαμένου κατοικιδίου" },
      calendar: { en: "Health calendar", el: "Ημερολόγιο υγείας" },
    };
    return labels[key]?.[lang] || key;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300 sm:text-4xl">{t("pricing_h1")}</h1>
      <p className="mt-4 text-lg text-foreground-muted">
        {t("pricing_intro")}
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Free Plan */}
        <div className="flex flex-col rounded-2xl border-2 border-mint bg-card p-5 shadow-sm transition-colors duration-300 sm:p-6">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t("pricing_free_title")}</h2>
          <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{t("pricing_free_sub")}</p>
          
          {/* What's included */}
          <div className="mt-4 flex-1">
            <p className="mb-2 text-sm font-semibold text-foreground">
              {lang === "el" ? "Περιλαμβάνει:" : "Includes:"}
            </p>
            <ul className="space-y-2 text-sm text-foreground-muted">
              {freeFeatures.map((feature) => (
                <li key={feature.key} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  <span>
                    {getFeatureLabel(feature.key)}
                    {feature.note && <span className="text-[10px] text-foreground-subtle"> {feature.note}</span>}
                  </span>
                </li>
              ))}
            </ul>

            {/* What's missing (Pro features) */}
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold text-foreground-muted">
                {lang === "el" ? "Δεν περιλαμβάνει:" : "Not included:"}
              </p>
              <ul className="space-y-1.5 text-sm text-foreground-subtle">
                {proOnlyFeatures.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                    <span className="opacity-70">{getFeatureLabel(feature.key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <AnimatedButton href="/get-qr-tag" variant="primary" className="w-full justify-center">
              {t("pricing_free_btn")}
            </AnimatedButton>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="relative flex flex-col rounded-2xl border-2 border-sky bg-card p-5 shadow-sm transition-colors duration-300 sm:p-6">
          <div className="absolute -top-3 right-4 rounded-full bg-sky px-3 py-1 text-xs font-bold text-white">
            {t("pricing_pro_badge")}
          </div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t("pricing_pro_title")}</h2>
          <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            €{PRO_PRICE.toFixed(2)}<span className="text-sm font-normal text-foreground-muted">/{lang === "el" ? "μήνα" : "month"}</span>
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {lang === "el" ? "Όλα τα δωρεάν χαρακτηριστικά + premium λειτουργίες" : "All free features + premium features"}
          </p>
          
          <ul className="mt-4 flex-1 space-y-2 text-sm text-foreground-muted">
            {allProFeatures.map((feature) => (
              <li key={feature.key} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky" />
                <span>
                  {getFeatureLabel(feature.key)}
                  {feature.note && <span className="text-[10px] text-foreground-subtle"> {feature.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-4 border-t border-border">
            <AnimatedButton variant="sky" onClick={handleAddProToCart} className="w-full justify-center">
              {t("pricing_pro_btn")}
            </AnimatedButton>
          </div>
        </div>
      </div>
      <p className="mt-6 text-sm text-foreground-muted">
        {t("pricing_footer")}{" "}
        <Link href="/shipping-returns" className="text-navy-soft hover:underline transition-colors duration-300">
          {t("pricing_shipping_link")}
        </Link>{" "}
        {t("pricing_footer_suffix")}
      </p>
    </div>
  );
}
