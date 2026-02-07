"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageBar() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="w-full border-b border-border bg-background/98 transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl justify-end px-6 py-1.5">
        <div className="flex rounded-full border border-border bg-card p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setLang("el")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-300 ${
              lang === "el" ? "bg-mint text-foreground" : "text-foreground-muted hover:bg-background-secondary"
            }`}
            aria-pressed={lang === "el"}
            aria-label="Ελληνικά"
          >
            ΕΛ
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              lang === "en" ? "bg-mint text-foreground" : "text-foreground-muted hover:bg-background-secondary"
            }`}
            aria-pressed={lang === "en"}
            aria-label="English"
          >
            ENG
          </button>
        </div>
      </div>
    </div>
  );
}
