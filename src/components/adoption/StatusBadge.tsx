"use client";

import { useLanguage } from "@/contexts/LanguageContext";

type Status = "available" | "pending" | "adopted";

const statusConfig: Record<Status, { bg: string; text: string }> = {
  available: { bg: "bg-green-100", text: "text-green-700" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  adopted: { bg: "bg-blue-100", text: "text-blue-700" },
};

type Props = {
  status: Status;
  size?: "sm" | "md";
};

export default function StatusBadge({ status, size = "sm" }: Props) {
  const { lang } = useLanguage();
  
  const labels: Record<Status, { en: string; el: string }> = {
    available: { en: "Available", el: "Διαθέσιμο" },
    pending: { en: "Pending", el: "Σε αναμονή" },
    adopted: { en: "Adopted", el: "Υιοθετήθηκε" },
  };

  const config = statusConfig[status];
  const label = labels[status][lang];
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs" 
    : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      {label}
    </span>
  );
}
