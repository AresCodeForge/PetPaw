"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import type { MessageRow } from "@/app/api/messages/[conversationId]/route";

type Props = {
  messages: MessageRow[];
  currentUserId: string;
};

export default function ChatMessages({ messages, currentUserId }: Props) {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
        {lang === "el" ? "Κανένα μήνυμα ακόμα. Ξεκινήστε τη συνομιλία!" : "No messages yet. Start the conversation!"}
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageRow[] }[] = [];
  let currentDate = "";

  messages.forEach((msg) => {
    const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-foreground-subtle">
              {format(new Date(group.date), "PPP", { locale: lang === "el" ? el : enUS })}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {group.messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[75%] gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar (only for other user) */}
                    {!isMine && (
                      msg.sender?.avatar_url ? (
                        <img
                          src={msg.sender.avatar_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border text-sm font-medium text-foreground-muted">
                          {msg.sender?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )
                    )}

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 transition-colors duration-300 ${
                        isMine
                          ? "rounded-tr-sm bg-navy-soft text-white"
                          : "rounded-tl-sm bg-background-secondary text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                      <p className={`mt-1 text-xs ${isMine ? "text-white/70" : "text-foreground-subtle"}`}>
                        {format(new Date(msg.created_at), "p", { locale: lang === "el" ? el : enUS })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
