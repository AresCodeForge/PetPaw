"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  X, UserX, Ban, VolumeX, AlertTriangle,
  Clock, Shield, ShieldCheck, Crown, Star, HandHelping,
  Stethoscope, HeartHandshake, GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { type ChatUserRole } from "./RoleBadge";

const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Shield, HandHelping, Stethoscope,
  Crown, HeartHandshake, GraduationCap, Star,
};

type Props = {
  targetUserId: string;
  targetUserName: string;
  roomSlug?: string;
  currentUserPermissions: string[];
  isSiteAdmin?: boolean; // whether the current user is a site-wide admin
  allRoles?: { name: string; display_name_en: string; display_name_el: string; icon: string; color: string; is_administrative: boolean }[];
  targetUserRoles?: ChatUserRole[];
  onClose: () => void;
  onActionComplete?: () => void;
};

const DURATION_OPTIONS = [
  { key: "5m", en: "5 minutes", el: "5 λεπτά" },
  { key: "15m", en: "15 minutes", el: "15 λεπτά" },
  { key: "30m", en: "30 minutes", el: "30 λεπτά" },
  { key: "1h", en: "1 hour", el: "1 ώρα" },
  { key: "6h", en: "6 hours", el: "6 ώρες" },
  { key: "24h", en: "24 hours", el: "24 ώρες" },
  { key: "7d", en: "7 days", el: "7 ημέρες" },
  { key: "30d", en: "30 days", el: "30 ημέρες" },
  { key: "permanent", en: "Permanent", el: "Μόνιμο" },
];

export default function ModerationMenu({
  targetUserId,
  targetUserName,
  roomSlug,
  currentUserPermissions,
  isSiteAdmin = false,
  allRoles = [],
  targetUserRoles = [],
  onClose,
  onActionComplete,
}: Props) {
  const { lang } = useLanguage();
  const [view, setView] = useState<"main" | "ban" | "silence" | "roles">("main");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const can = (perm: string) => currentUserPermissions.includes(perm);

  const labels = {
    en: {
      title: "Moderate User",
      warn: "Warn",
      kick: "Kick from room",
      silence: "Silence",
      ban: "Ban",
      manageRoles: "Manage Roles",
      reason: "Reason (optional)",
      selectDuration: "Select duration",
      cancel: "Cancel",
      confirm: "Confirm",
      success: "Action applied",
      assignRole: "Assign",
      removeRole: "Remove",
    },
    el: {
      title: "Διαχείριση Χρήστη",
      warn: "Προειδοποίηση",
      kick: "Αποβολή",
      silence: "Σίγαση",
      ban: "Αποκλεισμός",
      manageRoles: "Διαχ. Ρόλων",
      reason: "Αιτία (προαιρετικό)",
      selectDuration: "Επιλέξτε διάρκεια",
      cancel: "Ακύρωση",
      confirm: "Επιβεβαίωση",
      success: "Η ενέργεια εφαρμόστηκε",
      assignRole: "Ανάθεση",
      removeRole: "Αφαίρεση",
    },
  }[lang];

  const performAction = async (actionType: string, duration?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          target_user_id: targetUserId,
          room_slug: roomSlug,
          duration,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      onActionComplete?.();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = async (roleName: string, hasRole: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = "/api/chat/roles/assign";
      const res = hasRole
        ? await fetch(`${url}?user_id=${targetUserId}&role_name=${roleName}`, { method: "DELETE" })
        : await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: targetUserId, role_name: roleName }),
          });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }
      onActionComplete?.();
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const targetRoleNames = new Set(targetUserRoles.map(r => r.name));

  // ── Duration picker view (for ban / silence) ──
  if (view === "ban" || view === "silence") {
    const actionType = view;
    const durationOpts = actionType === "silence"
      ? DURATION_OPTIONS.filter(d => d.key !== "permanent" && d.key !== "30d" && d.key !== "7d")
      : DURATION_OPTIONS;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {actionType === "ban" ? labels.ban : labels.silence} — {targetUserName}
            </h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reason */}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={labels.reason}
            className="mb-3 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none"
          />

          <p className="text-xs text-foreground-subtle mb-2">{labels.selectDuration}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {durationOpts.map((d) => (
              <button
                key={d.key}
                disabled={isLoading}
                onClick={() => performAction(actionType, d.key)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border/30 disabled:opacity-50 transition-colors"
              >
                {lang === "el" ? d.el : d.en}
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={() => setView("main")}
            className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs text-foreground-muted hover:bg-border/30 transition-colors"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    );
  }

  // ── Roles management view ──
  if (view === "roles") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{labels.manageRoles} — {targetUserName}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {allRoles.filter(r => isSiteAdmin ? true : r.name !== "admin").map((role) => {
              const hasRole = targetRoleNames.has(role.name);
              return (
                <div key={role.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const RoleIcon = ROLE_ICON_MAP[role.icon] || Shield;
                      return <RoleIcon className="h-3.5 w-3.5 shrink-0" style={{ color: role.color }} />;
                    })()}
                    <span className="text-sm text-foreground">{lang === "el" ? role.display_name_el : role.display_name_en}</span>
                  </div>
                  <button
                    disabled={isLoading}
                    onClick={() => toggleRole(role.name, hasRole)}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      hasRole
                        ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                        : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20"
                    }`}
                  >
                    {hasRole ? labels.removeRole : labels.assignRole}
                  </button>
                </div>
              );
            })}
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={() => setView("main")}
            className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs text-foreground-muted hover:bg-border/30 transition-colors"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-72 rounded-xl border border-border bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-foreground-subtle mb-3">{targetUserName}</p>

        <div className="space-y-1.5">
          {/* Warn */}
          {can("warn_user") && (
            <button
              disabled={isLoading}
              onClick={() => performAction("warn")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {labels.warn}
            </button>
          )}

          {/* Kick */}
          {can("kick_user") && (
            <button
              disabled={isLoading}
              onClick={() => performAction("kick")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors disabled:opacity-50"
            >
              <UserX className="h-4 w-4 text-orange-500" />
              {labels.kick}
            </button>
          )}

          {/* Silence */}
          {can("silence_user") && (
            <button
              disabled={isLoading}
              onClick={() => setView("silence")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors disabled:opacity-50"
            >
              <VolumeX className="h-4 w-4 text-purple-500" />
              {labels.silence}
              <Clock className="ml-auto h-3.5 w-3.5 text-foreground-subtle" />
            </button>
          )}

          {/* Ban */}
          {can("ban_user") && (
            <button
              disabled={isLoading}
              onClick={() => setView("ban")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              {labels.ban}
              <Clock className="ml-auto h-3.5 w-3.5 text-foreground-subtle" />
            </button>
          )}

          {/* Manage Roles */}
          {can("assign_roles") && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                disabled={isLoading}
                onClick={() => setView("roles")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-navy-soft/5 transition-colors disabled:opacity-50"
              >
                <Shield className="h-4 w-4 text-navy-soft" />
                {labels.manageRoles}
              </button>
            </>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
