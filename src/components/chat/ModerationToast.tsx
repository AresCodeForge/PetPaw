"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import { Ban, VolumeX, AlertTriangle, UserX } from "lucide-react";

type ModerationAlert = {
  id: string;
  action_type: "ban" | "silence" | "kick" | "warn";
  reason: string | null;
  expires_at: string | null;
  duration_minutes: number | null;
};

type Props = {
  currentUserId: string;
  roomSlug?: string;
};

const ICONS = {
  ban: Ban,
  silence: VolumeX,
  warn: AlertTriangle,
  kick: UserX,
};

const COLORS = {
  ban: "border-red-500 bg-red-50 dark:bg-red-500/10",
  silence: "border-purple-500 bg-purple-50 dark:bg-purple-500/10",
  warn: "border-amber-500 bg-amber-50 dark:bg-amber-500/10",
  kick: "border-orange-500 bg-orange-50 dark:bg-orange-500/10",
};

const ICON_COLORS = {
  ban: "text-red-500",
  silence: "text-purple-500",
  warn: "text-amber-500",
  kick: "text-orange-500",
};

function formatDuration(minutes: number | null, lang: string): string {
  if (!minutes) return lang === "el" ? "Μόνιμο" : "Permanent";
  if (minutes < 60) return `${minutes} ${lang === "el" ? "λεπτά" : "min"}`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} ${lang === "el" ? "ώρες" : "hours"}`;
  return `${Math.round(minutes / 1440)} ${lang === "el" ? "ημέρες" : "days"}`;
}

export default function ModerationToast({ currentUserId, roomSlug }: Props) {
  const { lang } = useLanguage();
  const [alerts, setAlerts] = useState<ModerationAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());

  const labels = {
    en: {
      ban: "You have been banned",
      silence: "You have been silenced",
      warn: "You have received a warning",
      kick: "You have been kicked",
      reason: "Reason",
      duration: "Duration",
      dismiss: "OK",
    },
    el: {
      ban: "Σας απέκλεισαν",
      silence: "Σας σίγασαν",
      warn: "Λάβατε προειδοποίηση",
      kick: "Σας απέβαλαν",
      reason: "Αιτία",
      duration: "Διάρκεια",
      dismiss: "OK",
    },
  }[lang];

  const checkModeration = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const params = new URLSearchParams({ user_id: currentUserId });
      if (roomSlug) params.set("room_slug", roomSlug);

      const res = await fetch(`/api/chat/moderation/action?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      const actions: ModerationAlert[] = (data.actions ?? []).map((a: any) => ({
        id: a.id,
        action_type: a.action_type,
        reason: a.reason,
        expires_at: a.expires_at,
        duration_minutes: a.duration_minutes,
      }));

      // Find new actions that haven't been seen yet
      const newAlerts = actions.filter(a => !seenIdsRef.current.has(a.id));
      if (newAlerts.length > 0) {
        setAlerts(prev => [...prev, ...newAlerts]);
        for (const a of newAlerts) seenIdsRef.current.add(a.id);
      }
    } catch {
      // silent
    }
  }, [currentUserId, roomSlug]);

  // Initial check + realtime subscription
  useEffect(() => {
    // Check once on mount
    checkModeration();

    // Subscribe to new moderation actions via Supabase realtime
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`mod-actions-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_moderation_actions",
        },
        (payload) => {
          const action = payload.new as any;
          // Only alert if this action targets the current user
          if (action.user_id === currentUserId && !seenIdsRef.current.has(action.id)) {
            seenIdsRef.current.add(action.id);
            setAlerts(prev => [...prev, {
              id: action.id,
              action_type: action.action_type,
              reason: action.reason,
              expires_at: action.expires_at,
              duration_minutes: action.duration_minutes,
            }]);
          }
        }
      )
      .subscribe();

    // Fallback poll every 60 seconds (realtime is primary)
    const interval = setInterval(checkModeration, 60000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, checkModeration]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[380px] max-w-[95vw]">
      {visibleAlerts.map(alert => {
        const Icon = ICONS[alert.action_type] || AlertTriangle;
        const colorClass = COLORS[alert.action_type] || COLORS.warn;
        const iconColor = ICON_COLORS[alert.action_type] || ICON_COLORS.warn;
        const title = labels[alert.action_type as keyof typeof labels] || alert.action_type;

        return (
          <div
            key={alert.id}
            className={`relative flex items-start gap-3 rounded-xl border-l-4 px-4 py-3 shadow-lg backdrop-blur-sm ${colorClass}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {alert.reason && (
                <p className="text-xs text-foreground-subtle mt-0.5">
                  <span className="font-medium">{labels.reason}:</span> {alert.reason}
                </p>
              )}
              {alert.action_type !== "warn" && alert.action_type !== "kick" && (
                <p className="text-xs text-foreground-subtle mt-0.5">
                  <span className="font-medium">{labels.duration}:</span>{" "}
                  {formatDuration(alert.duration_minutes, lang)}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-foreground-muted hover:bg-border/50 transition-colors"
            >
              {labels.dismiss}
            </button>
          </div>
        );
      })}
    </div>
  );
}
