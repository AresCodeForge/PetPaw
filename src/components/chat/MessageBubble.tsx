"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reply, Smile, Trash2 } from "lucide-react";
import Image from "next/image";
import { format, isToday } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { RoleBadges, type ChatUserRole } from "./RoleBadge";

type MessageUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type Reaction = {
  emoji: string;
  count: number;
  users: string[];
};

type ReplyTo = {
  id: string;
  content: string;
  user: { name: string | null };
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to_id: string | null;
  mentions: string[];
  is_deleted: boolean;
  created_at: string;
  message_type?: "user" | "system";
  user: MessageUser | null;
  reply_to: ReplyTo | null;
  reactions: Reaction[];
  roles?: ChatUserRole[];
};

type Props = {
  message: ChatMessage;
  currentUserId?: string;
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  isAdmin?: boolean;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function MessageBubble({
  message,
  currentUserId,
  onReply,
  onReact,
  onRemoveReaction,
  onDelete,
  isAdmin,
}: Props) {
  const { lang } = useLanguage();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isOwnMessage = currentUserId === message.user_id;
  const dateLocale = lang === "el" ? el : enUS;
  const msgDate = new Date(message.created_at);
  const timestamp = isToday(msgDate)
    ? format(msgDate, "HH:mm", { locale: dateLocale })
    : format(msgDate, "dd/MM HH:mm", { locale: dateLocale });
  const userName = message.user?.name || (lang === "el" ? "Άγνωστος" : "Unknown");
  const avatarUrl = message.user?.avatar_url;

  const handleReactionClick = (emoji: string) => {
    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.users.includes(currentUserId || "")
    );
    if (existingReaction && onRemoveReaction) {
      onRemoveReaction(message.id, emoji);
    } else if (onReact) {
      onReact(message.id, emoji);
    }
    setShowReactions(false);
  };

  return (
    <div
      className="group relative flex items-start gap-2 px-3 py-1 hover:bg-background-secondary/50 transition-colors duration-150"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar - small, matches right-bar size */}
      <div className="mt-0.5 flex-shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-[10px] font-medium text-foreground-muted">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Reply preview */}
        {message.reply_to && (
          <div className="mb-0.5 rounded bg-border/20 px-2 py-1 text-xs text-foreground-muted border-l-2 border-navy-soft">
            <span className="font-medium">{message.reply_to.user.name || "Unknown"}: </span>
            <span className="line-clamp-1">{message.reply_to.content}</span>
          </div>
        )}

        {/* Inline message: username [badges]: content ... timestamp */}
        <div className="flex items-baseline gap-1">
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <span className={`text-xs font-semibold ${isOwnMessage ? "text-navy-soft" : "text-foreground"}`}>
              {userName}
            </span>
            {(message.roles ?? []).length > 0 && (
              <span className="relative top-px">
                <RoleBadges roles={message.roles!} size="sm" />
              </span>
            )}
            <span className={`text-xs font-semibold ${isOwnMessage ? "text-navy-soft" : "text-foreground"}`}>:</span>
          </span>
          <span className="text-sm text-foreground whitespace-pre-wrap break-words min-w-0">
            {message.content}
          </span>
                <span className="ml-auto shrink-0 pl-2 text-[10px] text-black/50 dark:text-white/50 tabular-nums">
            {timestamp}
          </span>
        </div>

        {/* Image */}
        {message.image_url && (
          <div className="mt-1">
            <Image
              src={message.image_url}
              alt="Shared image"
              width={240}
              height={160}
              className="rounded-lg max-w-[240px] h-auto"
            />
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {message.reactions.map((reaction) => {
              const hasReacted = reaction.users.includes(currentUserId || "");
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReactionClick(reaction.emoji)}
                  className={`flex items-center gap-0.5 rounded-full px-1.5 py-0 text-xs transition-colors duration-150 ${
                    hasReacted
                      ? "bg-mint-bg text-navy-soft"
                      : "bg-border/20 text-foreground-muted hover:bg-border/40"
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px]">{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons - appear on hover: React, Reply, Delete only */}
      {showActions && (
        <div className="absolute -top-3 right-3 z-10 flex items-center gap-0.5 rounded-md bg-card shadow-md border border-border px-0.5 py-0.5">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1 rounded hover:bg-border/30 text-foreground-muted transition-colors duration-150"
            title={lang === "el" ? "Αντίδραση" : "React"}
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onReply?.(message)}
            className="p-1 rounded hover:bg-border/30 text-foreground-muted transition-colors duration-150"
            title={lang === "el" ? "Απάντηση" : "Reply"}
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {(isOwnMessage || isAdmin) && (
            <button
              onClick={() => onDelete?.(message.id)}
              className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors duration-150"
              title={lang === "el" ? "Διαγραφή" : "Delete"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Reaction picker */}
      {showReactions && (
        <div className="absolute -top-1 right-3 z-20 flex items-center gap-0.5 rounded-md bg-card shadow-lg border border-border px-1.5 py-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className="p-0.5 text-base hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
