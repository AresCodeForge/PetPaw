"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import {
  ShieldCheck, Shield, HandHelping, Stethoscope, Crown,
  HeartHandshake, GraduationCap, Star, type LucideIcon,
} from "lucide-react";

// ── Shared type used across chat components ──
export type ChatUserRole = {
  name: string;
  display_name_en: string;
  display_name_el: string;
  icon: string;
  color: string;
  priority: number;
  is_administrative: boolean;
  permissions: string[];
};

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  Shield,
  HandHelping,
  Stethoscope,
  Crown,
  HeartHandshake,
  GraduationCap,
  Star,
};

type Props = {
  role: ChatUserRole;
  size?: "sm" | "md";
};

export default function RoleBadge({ role, size = "sm" }: Props) {
  const { lang } = useLanguage();
  const Icon = ICON_MAP[role.icon] || Shield;
  const displayName = lang === "el" ? role.display_name_el : role.display_name_en;
  const px = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className="inline-flex items-center shrink-0"
      title={displayName}
    >
      <Icon className={px} style={{ color: role.color }} />
    </span>
  );
}

/** Render a row of badges, sorted by priority (highest first) */
export function RoleBadges({ roles, size = "sm" }: { roles: ChatUserRole[]; size?: "sm" | "md" }) {
  if (!roles || roles.length === 0) return null;
  const sorted = [...roles].sort((a, b) => b.priority - a.priority);
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      {sorted.map((r) => (
        <RoleBadge key={r.name} role={r} size={size} />
      ))}
    </span>
  );
}

/** Check if a roles array includes a specific permission */
export function hasPermission(roles: ChatUserRole[], perm: string): boolean {
  return roles.some((r) => r.permissions.includes(perm));
}
