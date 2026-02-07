"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, MessageSquare, ChevronRight, Gavel, Ban, VolumeX, Undo2 } from "lucide-react";
import Image from "next/image";
import { RoleBadges, type ChatUserRole } from "./RoleBadge";

type OnlineUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  roles?: ChatUserRole[];
  is_banned?: boolean;
  is_silenced?: boolean;
};

type Props = {
  users: OnlineUser[];
  currentUserId?: string;
  currentUserPermissions?: string[];
  roomSlug?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onStartDM: (userId: string, userName: string | null) => void;
  onModerate?: (userId: string, userName: string) => void;
  onUndoAction?: () => void;
};

export default function OnlineUsersPanel({
  users,
  currentUserId,
  currentUserPermissions = [],
  roomSlug,
  isCollapsed,
  onToggle,
  onStartDM,
  onModerate,
  onUndoAction,
}: Props) {
  const { lang } = useLanguage();
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canModerate = currentUserPermissions.length > 0;

  const [undoingFor, setUndoingFor] = useState<string | null>(null);

  const labels = {
    en: {
      title: "Online Users",
      noUsers: "No users online",
      sendMessage: "Send message",
      moderate: "Moderate user",
      you: "(You)",
      banned: "Banned",
      silenced: "Silenced",
      unban: "Unban",
      unsilence: "Unsilence",
    },
    el: {
      title: "Συνδεδεμένοι",
      noUsers: "Κανείς δεν είναι συνδεδεμένος",
      sendMessage: "Αποστολή μηνύματος",
      moderate: "Διαχείριση χρήστη",
      you: "(Εσύ)",
      banned: "Αποκλεισμένος",
      silenced: "Σε σίγαση",
      unban: "Αναίρεση αποκλ.",
      unsilence: "Αναίρεση σίγασης",
    },
  }[lang];

  const handleUndo = async (userId: string, actionType: "ban" | "silence") => {
    setUndoingFor(userId);
    try {
      const params = new URLSearchParams({
        user_id: userId,
        action_type: actionType,
        ...(roomSlug ? { room_slug: roomSlug } : {}),
      });
      const res = await fetch(`/api/chat/moderation/action?${params}`, { method: "DELETE" });
      if (res.ok) {
        onUndoAction?.();
      }
    } catch {
      // silent
    } finally {
      setUndoingFor(null);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenFor) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenFor]);

  // Sort: current user first, then by highest role priority, then alphabetically
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    const aPriority = Math.max(0, ...(a.roles ?? []).map(r => r.priority));
    const bPriority = Math.max(0, ...(b.roles ?? []).map(r => r.priority));
    if (bPriority !== aPriority) return bPriority - aPriority;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="flex h-full w-10 flex-col items-center justify-center gap-2 border-l border-border bg-background-secondary text-foreground-muted hover:bg-border/30 transition-colors duration-300"
        title={labels.title}
      >
        <Users className="h-5 w-5" />
        <span className="text-xs font-medium">{users.length}</span>
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-border bg-background-secondary transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-foreground">{labels.title}</span>
          <span className="text-sm text-foreground-subtle">({users.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-foreground-muted hover:bg-border transition-colors duration-300"
          title={lang === "el" ? "Απόκρυψη" : "Hide"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-foreground-muted mb-2" />
            <p className="text-sm text-foreground-subtle">{labels.noUsers}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedUsers.map((user) => {
              const isMe = user.id === currentUserId;
              const userRoles = user.roles ?? [];
              const isMenuOpen = menuOpenFor === user.id;

              return (
                <div key={user.id} className="relative">
                  <div
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
                      isMe ? "bg-navy-soft/5" : isMenuOpen ? "bg-border" : "hover:bg-border/50"
                    }`}
                  >
                    {/* Clickable area: avatar + name → opens action menu */}
                    <div
                      className={`flex flex-1 min-w-0 items-center gap-2 ${!isMe ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (!isMe) setMenuOpenFor(isMenuOpen ? null : user.id);
                      }}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name || "User"}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-soft text-[10px] font-medium text-white">
                            {(user.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background-secondary bg-green-500" />
                      </div>

                      {/* Name + role badges + moderation status */}
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <span className="text-sm text-foreground truncate">
                          {user.name || (lang === "el" ? "Άγνωστος" : "Unknown")}
                          {isMe && (
                            <span className="ml-1 text-xs font-normal text-foreground-subtle">{labels.you}</span>
                          )}
                        </span>
                        <RoleBadges roles={userRoles} size="sm" />
                        {user.is_banned && (
                          <span title={labels.banned}>
                            <Ban className="h-3 w-3 text-red-500 shrink-0" />
                          </span>
                        )}
                        {user.is_silenced && !user.is_banned && (
                          <span title={labels.silenced}>
                            <VolumeX className="h-3 w-3 text-purple-500 shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DM button — always visible, separate from the click area */}
                    {!isMe && (
                      <button
                        className="shrink-0 rounded p-1 text-navy-soft hover:bg-mint-bg transition-colors duration-150"
                        onClick={() => onStartDM(user.id, user.name)}
                        title={labels.sendMessage}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Action menu — drops down below the user row on click */}
                  {isMenuOpen && !isMe && (
                    <div
                      ref={menuRef}
                      className="mx-1 mt-0.5 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-10"
                    >
                      {/* Moderate */}
                      {canModerate && onModerate && (
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                          onClick={() => {
                            setMenuOpenFor(null);
                            onModerate(user.id, user.name || "Unknown");
                          }}
                        >
                          <Gavel className="h-4 w-4 text-amber-500" />
                          {labels.moderate}
                        </button>
                      )}
                      {/* Undo ban */}
                      {user.is_banned && canModerate && currentUserPermissions.includes("ban_user") && (
                        <button
                          disabled={undoingFor === user.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          onClick={() => {
                            handleUndo(user.id, "ban");
                            setMenuOpenFor(null);
                          }}
                        >
                          <Undo2 className="h-4 w-4" />
                          {labels.unban}
                        </button>
                      )}
                      {/* Undo silence */}
                      {user.is_silenced && !user.is_banned && canModerate && currentUserPermissions.includes("silence_user") && (
                        <button
                          disabled={undoingFor === user.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          onClick={() => {
                            handleUndo(user.id, "silence");
                            setMenuOpenFor(null);
                          }}
                        >
                          <Undo2 className="h-4 w-4" />
                          {labels.unsilence}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
