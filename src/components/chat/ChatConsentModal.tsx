"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

type Props = {
  onAccept: () => void;
};

export default function ChatConsentModal({ onAccept }: Props) {
  const { lang } = useLanguage();
  const [birthYear, setBirthYear] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const minAge = 13;

  const labels = {
    en: {
      title: "Welcome to Community Chat",
      subtitle: "Before you start chatting, please review and accept our guidelines.",
      ageLabel: "Birth Year",
      agePlaceholder: "e.g. 2000",
      ageError: `You must be at least ${minAge} years old to use chat.`,
      ageRequired: "Please enter your birth year.",
      tosLabel: "I accept the Terms of Service and Privacy Policy for community chat.",
      guidelinesLabel:
        "I agree to follow the community guidelines: be respectful, no harassment, no spam, no illegal content, and no sharing of inappropriate material.",
      submit: "Join Chat",
      allRequired: "Please complete all fields above.",
    },
    el: {
      title: "Καλώς ήρθατε στην Κοινοτική Συνομιλία",
      subtitle: "Πριν ξεκινήσετε, παρακαλώ αποδεχτείτε τις οδηγίες μας.",
      ageLabel: "Έτος Γέννησης",
      agePlaceholder: "π.χ. 2000",
      ageError: `Πρέπει να είστε τουλάχιστον ${minAge} ετών για να χρησιμοποιήσετε τη συνομιλία.`,
      ageRequired: "Παρακαλώ εισάγετε το έτος γέννησης.",
      tosLabel: "Αποδέχομαι τους Όρους Χρήσης και την Πολιτική Απορρήτου για την κοινοτική συνομιλία.",
      guidelinesLabel:
        "Συμφωνώ να ακολουθώ τις οδηγίες κοινότητας: σεβασμός, χωρίς παρενόχληση, χωρίς spam, χωρίς παράνομο περιεχόμενο και χωρίς ακατάλληλο υλικό.",
      submit: "Είσοδος στη Συνομιλία",
      allRequired: "Παρακαλώ συμπληρώστε όλα τα πεδία.",
    },
  }[lang];

  const handleSubmit = async () => {
    setError(null);

    if (!birthYear) {
      setError(labels.ageRequired);
      return;
    }

    const year = parseInt(birthYear, 10);
    if (isNaN(year) || year < 1900 || year > currentYear) {
      setError(labels.ageRequired);
      return;
    }

    if (currentYear - year < minAge) {
      setError(labels.ageError);
      return;
    }

    if (!tosAccepted || !guidelinesAccepted) {
      setError(labels.allRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chat/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth_year: year }),
      });

      if (res.ok) {
        onAccept();
      } else {
        const data = await res.json().catch(() => null);
        if (data?.code === "E4016") {
          setError(labels.ageError);
        } else {
          setError(data?.message || data?.error || (lang === "el" ? "Κάτι πήγε στραβά" : "Something went wrong. Please try again."));
        }
      }
    } catch {
      setError("Network error");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex h-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg transition-colors duration-300">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-navy-soft/10">
            <Shield className="h-7 w-7 text-navy-soft" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{labels.title}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{labels.subtitle}</p>
        </div>

        {/* Birth year */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground">
            {labels.ageLabel}
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder={labels.agePlaceholder}
            min={1900}
            max={currentYear}
            className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none transition-colors duration-300"
          />
        </div>

        {/* ToS checkbox */}
        <label className="mb-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-navy-soft"
          />
          <span className="text-sm text-foreground-muted">{labels.tosLabel}</span>
        </label>

        {/* Guidelines checkbox */}
        <label className="mb-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={guidelinesAccepted}
            onChange={(e) => setGuidelinesAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-navy-soft"
          />
          <span className="text-sm text-foreground-muted">{labels.guidelinesLabel}</span>
        </label>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-soft px-4 py-2.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90 disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          {labels.submit}
        </button>
      </div>
    </div>
  );
}
