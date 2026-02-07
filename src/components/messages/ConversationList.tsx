"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import type { ConversationWithDetails } from "@/app/api/messages/route";

type Props = {
  conversations: ConversationWithDetails[];
  activeId?: string;
  onSelect: (id: string) => void;
};

export default function ConversationList({ conversations, activeId, onSelect }: Props) {
  const { lang } = useLanguage();

  const labels = {
    noConversations: { en: "No conversations yet", el: "Δεν υπάρχουν συνομιλίες ακόμα" },
    you: { en: "You", el: "Εσείς" },
  };

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-foreground-muted">
        {labels.noConversations[lang]}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId;
        const hasUnread = conv.unread_count > 0;
        const lastMessagePreview = conv.last_message?.content?.slice(0, 50) || "";
        const timeAgo = conv.last_message_at
          ? formatDistanceToNow(new Date(conv.last_message_at), {
              addSuffix: true,
              locale: lang === "el" ? el : enUS,
            })
          : "";

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex w-full items-start gap-3 p-4 text-left transition-colors duration-300 hover:bg-background-secondary ${
              isActive ? "bg-background-secondary" : ""
            }`}
          >
            {/* Avatar */}
            {conv.other_user?.avatar_url ? (
              <img
                src={conv.other_user.avatar_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-border text-lg font-medium text-foreground-muted">
                {conv.other_user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`truncate font-medium ${hasUnread ? "text-foreground" : "text-foreground-muted"}`}>
                  {conv.other_user?.name || (lang === "el" ? "Ανώνυμος" : "Anonymous")}
                </span>
                <span className="shrink-0 text-xs text-foreground-subtle">{timeAgo}</span>
              </div>
              
              <p className="mb-1 truncate text-sm text-navy-soft">
                {conv.listing?.pet_name || conv.listing?.title}
              </p>
              
              {conv.last_message && (
                <p className={`truncate text-sm ${hasUnread ? "font-medium text-foreground" : "text-foreground-muted"}`}>
                  {conv.last_message.sender_id === conv.other_user?.id 
                    ? lastMessagePreview
                    : `${labels.you[lang]}: ${lastMessagePreview}`}
                  {lastMessagePreview.length >= 50 && "..."}
                </p>
              )}
            </div>

            {/* Unread badge */}
            {hasUnread && (
              <span className="shrink-0 rounded-full bg-navy-soft px-2 py-0.5 text-xs font-medium text-white">
                {conv.unread_count > 9 ? "9+" : conv.unread_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
