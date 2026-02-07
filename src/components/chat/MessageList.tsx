"use client";

import { useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MessageBubble, { type ChatMessage } from "./MessageBubble";
import { format, isToday, isYesterday } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { LogIn, LogOut } from "lucide-react";

type Props = {
  messages: ChatMessage[];
  currentUserId?: string;
  isAdmin?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
};

export default function MessageList({
  messages,
  currentUserId,
  isAdmin,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onReact,
  onRemoveReaction,
  onDelete,
}: Props) {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dateLocale = lang === "el" ? el : enUS;

  const labels = {
    en: {
      today: "Today",
      yesterday: "Yesterday",
      loadMore: "Load older messages",
      loading: "Loading...",
      noMessages: "No messages yet. Be the first to say hello!",
    },
    el: {
      today: "Σήμερα",
      yesterday: "Χθες",
      loadMore: "Φόρτωση παλαιότερων",
      loading: "Φόρτωση...",
      noMessages: "Δεν υπάρχουν μηνύματα ακόμα. Πείτε πρώτοι ένα γεια!",
    },
  }[lang];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Group messages by date
  const groupedMessages: { date: string; label: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const msgDate = new Date(msg.created_at);
    const dateStr = format(msgDate, "yyyy-MM-dd");

    if (dateStr !== currentDate) {
      currentDate = dateStr;
      let dateLabel: string;

      if (isToday(msgDate)) {
        dateLabel = labels.today;
      } else if (isYesterday(msgDate)) {
        dateLabel = labels.yesterday;
      } else {
        dateLabel = format(msgDate, "EEEE, d MMMM", { locale: dateLocale });
      }

      groupedMessages.push({ date: dateStr, label: dateLabel, messages: [] });
    }

    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-foreground-subtle">
        <p>{labels.noMessages}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {/* Spacer pushes messages to bottom when content is short */}
      <div className="flex flex-col min-h-full justify-end">
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="rounded-full bg-border/30 px-4 py-2 text-sm text-foreground-muted hover:bg-border disabled:opacity-50 transition-colors duration-300"
            >
              {isLoadingMore ? labels.loading : labels.loadMore}
            </button>
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 px-4 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-foreground-subtle uppercase">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((message) =>
              message.message_type === "system" ? (
                <div key={message.id} className="flex flex-col items-center gap-0.5 py-1">
                  {message.content.split("\n").map((line, i) => {
                    const isJoin = line.startsWith("__joined__:");
                    const isLeave = line.startsWith("__left__:");
                    const names = line.replace(/^__(joined|left)__:/, "");
                    if (!isJoin && !isLeave) return null;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          isJoin ? "text-green-600 dark:text-green-400" : "text-[#f97316] dark:text-[#fb923c]"
                        }`}
                      >
                        {isJoin ? (
                          <LogIn className="h-3 w-3" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                        <span className="font-medium">
                          {isJoin
                            ? (lang === "el" ? "Μπήκαν" : "Joined")
                            : (lang === "el" ? "Έφυγαν" : "Left")}:
                        </span>
                        <span>{names}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onReply={onReply}
                  onReact={onReact}
                  onRemoveReaction={onRemoveReaction}
                  onDelete={onDelete}
                />
              )
            )}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
