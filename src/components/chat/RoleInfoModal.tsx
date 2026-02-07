"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import {
  X, ShieldCheck, Shield, HandHelping, Check, Minus,
  Stethoscope, Crown, HeartHandshake, GraduationCap, Star,
  type LucideIcon,
} from "lucide-react";

type Props = {
  onClose: () => void;
};

const ROLES: { name: string; en: string; el: string; icon: LucideIcon; color: string }[] = [
  { name: "admin", en: "Admin", el: "Διαχειριστής", icon: ShieldCheck, color: "#1e3a5f" },
  { name: "moderator", en: "Moderator", el: "Συντονιστής", icon: Shield, color: "#e07a5f" },
  { name: "helper", en: "Helper", el: "Βοηθός", icon: HandHelping, color: "#3b82f6" },
];

const PERMISSIONS: {
  key: string;
  en: string;
  el: string;
  subOptions?: { en: string; el: string }[];
}[] = [
  { key: "warn", en: "Warn users", el: "Προειδοποίηση" },
  { key: "delete", en: "Delete messages", el: "Διαγραφή μηνυμάτων" },
  { key: "kick", en: "Kick from room", el: "Αποβολή" },
  {
    key: "silence",
    en: "Silence (timed)",
    el: "Σίγαση (χρονική)",
    subOptions: [
      { en: "5 min", el: "5 λ." },
      { en: "15 min", el: "15 λ." },
      { en: "30 min", el: "30 λ." },
      { en: "1 hour", el: "1 ώ." },
      { en: "6 hours", el: "6 ώ." },
    ],
  },
  {
    key: "ban",
    en: "Ban (timed/perm)",
    el: "Αποκλεισμός",
    subOptions: [
      { en: "5 min", el: "5 λ." },
      { en: "15 min", el: "15 λ." },
      { en: "30 min", el: "30 λ." },
      { en: "1 hour", el: "1 ώ." },
      { en: "6 hours", el: "6 ώ." },
      { en: "24 hours", el: "24 ώ." },
      { en: "7 days", el: "7 ημ." },
      { en: "30 days", el: "30 ημ." },
      { en: "Permanent", el: "Μόνιμο" },
    ],
  },
  { key: "assign_roles", en: "Assign roles", el: "Ανάθεση ρόλων" },
  { key: "manage_rooms", en: "Create/edit/delete rooms", el: "Δημ./Επεξ./Διαγ. δωματίων" },
  { key: "make_admin", en: "Make someone Admin", el: "Ορισμός Διαχειριστή" },
];

const MATRIX: Record<string, Record<string, boolean>> = {
  warn:          { admin: true,  moderator: true,  helper: true },
  delete:        { admin: true,  moderator: true,  helper: true },
  kick:          { admin: true,  moderator: true,  helper: false },
  silence:       { admin: true,  moderator: true,  helper: false },
  ban:           { admin: true,  moderator: true,  helper: false },
  assign_roles:  { admin: true,  moderator: false, helper: false },
  manage_rooms:  { admin: true,  moderator: false, helper: false },
  make_admin:    { admin: true,  moderator: false, helper: false },
};

const COSMETIC_ROLES: { en: string; el: string; color: string; icon: LucideIcon }[] = [
  { en: "Veterinarian", el: "Κτηνίατρος", color: "#16a34a", icon: Stethoscope },
  { en: "Top Paw", el: "Κορυφαίο Πατουσάκι", color: "#d97706", icon: Crown },
  { en: "Rescue Hero", el: "Ήρωας Διάσωσης", color: "#ec4899", icon: HeartHandshake },
  { en: "Pet Scholar", el: "Γνώστης Ζώων", color: "#7c3aed", icon: GraduationCap },
  { en: "Pawstar", el: "Αστέρι", color: "#f59e0b", icon: Star },
];

export default function RoleInfoModal({ onClose }: Props) {
  const { lang } = useLanguage();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[520px] max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {lang === "el" ? "Ρόλοι & Δικαιώματα" : "Roles & Permissions"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info text */}
        <p className="text-xs text-foreground-subtle mb-4">
          {lang === "el"
            ? "Οι χαμηλότεροι ρόλοι δεν μπορούν να συντονίσουν ανώτερους. Π.χ. ένας Συντονιστής δεν μπορεί να αποκλείσει έναν Διαχειριστή."
            : "Lower roles cannot moderate higher roles. E.g. a Moderator cannot ban an Admin."}
        </p>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-xs font-medium text-foreground-subtle">
                  {lang === "el" ? "Δικαίωμα" : "Permission"}
                </th>
                {ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <th key={role.name} className="py-2 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Icon className="h-4 w-4" style={{ color: role.color }} />
                        <span className="text-[10px] font-semibold" style={{ color: role.color }}>
                          {lang === "el" ? role.el : role.en}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(perm => (
                <>
                  <tr key={perm.key} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-xs text-foreground">
                      {lang === "el" ? perm.el : perm.en}
                    </td>
                    {ROLES.map(role => {
                      const has = MATRIX[perm.key]?.[role.name];
                      return (
                        <td key={role.name} className="py-2 px-2 text-center">
                          {has ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <Minus className="h-4 w-4 text-foreground-subtle/30 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Sub-options row */}
                  {perm.subOptions && (
                    <tr key={`${perm.key}-sub`} className="border-b border-border/30">
                      <td colSpan={1 + ROLES.length} className="py-1 pl-4 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {perm.subOptions.map((opt, idx) => (
                            <span
                              key={idx}
                              className="inline-block rounded-full bg-border/40 px-2 py-0.5 text-[9px] text-foreground-subtle"
                            >
                              {lang === "el" ? opt.el : opt.en}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cosmetic roles section */}
        <div className="mt-4 pt-3 border-t border-border">
          <h3 className="text-xs font-semibold text-foreground-subtle mb-3">
            {lang === "el" ? "Διακοσμητικοί Ρόλοι (χωρίς δικαιώματα)" : "Cosmetic Roles (no permissions)"}
          </h3>
          <div className="flex flex-wrap gap-3">
            {COSMETIC_ROLES.map(r => {
              const Icon = r.icon;
              return (
                <div
                  key={r.en}
                  className="flex flex-col items-center gap-1 rounded-lg border px-3 py-2 min-w-[72px]"
                  style={{ borderColor: r.color }}
                >
                  <Icon className="h-4 w-4" style={{ color: r.color }} />
                  <span className="text-[10px] font-medium text-center leading-tight" style={{ color: r.color }}>
                    {lang === "el" ? r.el : r.en}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-foreground-subtle">
            {lang === "el"
              ? "Αυτοί οι ρόλοι είναι αποκλειστικά οπτικοί badges. Μόνο Admins μπορούν να τους αναθέσουν."
              : "These are visual-only badges. Only Admins can assign them."}
          </p>
        </div>
      </div>
    </div>
  );
}
