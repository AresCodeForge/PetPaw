"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { BadgeCheck } from "lucide-react";

type Props = {
  shelterName?: string | null;
  isVerified?: boolean;
  size?: "sm" | "md";
};

export default function ShelterBadge({ shelterName, isVerified = false, size = "sm" }: Props) {
  const { lang } = useLanguage();
  
  if (!shelterName) return null;

  const sizeClasses = size === "sm" 
    ? "text-xs gap-0.5" 
    : "text-sm gap-1";
  
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span 
      className={`inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 ${sizeClasses}`}
      title={isVerified 
        ? (lang === "el" ? "Πιστοποιημένο καταφύγιο" : "Verified shelter") 
        : (lang === "el" ? "Καταφύγιο" : "Shelter")}
    >
      {isVerified && <BadgeCheck className={iconSize} />}
      {shelterName}
    </span>
  );
}
