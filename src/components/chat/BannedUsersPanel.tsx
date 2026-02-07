"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Ban, VolumeX, Undo2, Search, Loader2, Clock } from "lucide-react";
import Image from "next/image";

type BannedAction = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  action_type: "ban" | "silence";
  reason: string | null;
  duration_minutes: number | null;
  expires_at: string | null;
  issued_at: string;
  issued_by_name: string;
  room_name: string;
};

type Props = {
  onClose: () => void;
  currentUserPermissions: string[];
};

function formatTimeLeft(expiresAt: string | null, lang: string): string {
  if (!expiresAt) return lang === "el" ? "Μόνιμο" : "Permanent";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return lang === "el" ? "Έληξε" : "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} ${lang === "el" ? "λ." : "min"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${lang === "el" ? "ώ." : "h"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${lang === "el" ? "ημ." : "d"}`;
}

export default function BannedUsersPanel({ onClose, currentUserPermissions }: Props) {
  const { lang } = useLanguage();
  const [actions, setActions] = useState<BannedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const labels = {
    en: {
      title: "Banned & Silenced Users",
      search: "Search by username...",
      noResults: "No active bans or silences",
      ban: "Banned",
      silence: "Silenced",
      by: "by",
      room: "Room",
      timeLeft: "Time left",
      unban: "Unban",
      unsilence: "Unsilence",
      reason: "Reason",
      permanent: "Permanent",
    },
    el: {
      title: "Αποκλεισμένοι & Σε Σίγαση",
      search: "Αναζήτηση χρήστη...",
      noResults: "Κανένας ενεργός αποκλεισμός ή σίγαση",
      ban: "Αποκλεισμένος",
      silence: "Σε σίγαση",
      by: "από",
      room: "Δωμάτιο",
      timeLeft: "Υπόλοιπο",
      unban: "Αναίρεση",
      unsilence: "Αναίρεση",
      reason: "Αιτία",
      permanent: "Μόνιμο",
    },
  }[lang];

  const fetchBanned = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat/moderation/banned");
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanned();
  }, [fetchBanned]);

  const handleUndo = async (actionId: string) => {
    setUndoingId(actionId);
    try {
      const res = await fetch(`/api/chat/moderation/action?action_id=${actionId}`, { method: "DELETE" });
      if (res.ok) {
        setActions(prev => prev.filter(a => a.id !== actionId));
      }
    } catch {
      // silent
    } finally {
      setUndoingId(null);
    }
  };

  const filtered = actions.filter(a =>
    a.user_name.toLowerCase().includes(search.toLowerCase())
  );

  const canUnban = currentUserPermissions.includes("ban_user");
  const canUnsilence = currentUserPermissions.includes("silence_user");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] max-w-[95vw] max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-foreground">{labels.title}</h2>
            <span className="text-xs text-foreground-subtle">({filtered.length})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={labels.search}
              className="w-full rounded-lg border border-border bg-background-secondary pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-navy-soft" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Ban className="h-8 w-8 text-foreground-muted mb-2" />
              <p className="text-sm text-foreground-subtle">{labels.noResults}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(action => {
                const isBan = action.action_type === "ban";
                const canUndo = isBan ? canUnban : canUnsilence;

                return (
                  <div key={action.id} className="rounded-lg border border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="shrink-0">
                        {action.user_avatar ? (
                          <Image src={action.user_avatar} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[10px] font-medium text-foreground-muted">
                            {action.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Name + type badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{action.user_name}</span>
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            isBan ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10"
                          }`}>
                            {isBan ? <Ban className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
                            {isBan ? labels.ban : labels.silence}
                          </span>
                        </div>
                      </div>

                      {/* Time left */}
                      <div className="flex items-center gap-1 shrink-0 text-xs text-foreground-subtle">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeLeft(action.expires_at, lang)}</span>
                      </div>

                      {/* Undo button */}
                      {canUndo && (
                        <button
                          disabled={undoingId === action.id}
                          onClick={() => handleUndo(action.id)}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          title={isBan ? labels.unban : labels.unsilence}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Details row */}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-subtle">
                      <span>{labels.room}: {action.room_name}</span>
                      <span>{labels.by} {action.issued_by_name}</span>
                      {action.reason && <span>{labels.reason}: {action.reason}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
