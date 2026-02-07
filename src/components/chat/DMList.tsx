"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";
import { MessageSquare, X } from "lucide-react";

type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  other_user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  unread_count: number;
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
};

type Props = {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUserId: string;
  onSelectConversation: (conv: Conversation) => void;
  onClose: () => void;
};

export default function DMList({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onClose,
}: Props) {
  const { lang } = useLanguage();

  const labels = {
    en: {
      title: "Direct Messages",
      noConversations: "No conversations yet",
      noConversationsHint: "Click on a user to start chatting",
      you: "You:",
    },
    el: {
      title: "Ιδιωτικά Μηνύματα",
      noConversations: "Δεν υπάρχουν συνομιλίες",
      noConversationsHint: "Κάντε κλικ σε έναν χρήστη για να ξεκινήσετε",
      you: "Εσείς:",
    },
  }[lang];

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return lang === "el" ? "τώρα" : "now";
    if (diffMins < 60) return `${diffMins}${lang === "el" ? "λ" : "m"}`;
    if (diffHours < 24) return `${diffHours}${lang === "el" ? "ω" : "h"}`;
    if (diffDays < 7) return `${diffDays}${lang === "el" ? "η" : "d"}`;
    return date.toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col bg-background-secondary transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-navy-soft" />
          <span className="font-semibold text-foreground">{labels.title}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-foreground-muted hover:bg-border transition-colors duration-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-12 w-12 text-foreground-muted mb-3" />
            <p className="font-medium text-foreground-muted">{labels.noConversations}</p>
            <p className="text-sm text-foreground-subtle mt-1">{labels.noConversationsHint}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const lastMsgPreview = conv.last_message
                ? conv.last_message.sender_id === currentUserId
                  ? `${labels.you} ${conv.last_message.content}`
                  : conv.last_message.content
                : null;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-300 hover:bg-border/30 ${
                    isActive ? "bg-border/50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.other_user.avatar_url ? (
                      <Image
                        src={conv.other_user.avatar_url}
                        alt={conv.other_user.name || "User"}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft text-lg font-medium text-white">
                        {(conv.other_user.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Unread badge */}
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e07a5f] px-1.5 text-xs font-bold text-white">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate font-medium ${
                          conv.unread_count > 0 ? "text-foreground" : "text-foreground-muted"
                        }`}
                      >
                        {conv.other_user.name || (lang === "el" ? "Άγνωστος" : "Unknown")}
                      </span>
                      {conv.last_message_at && (
                        <span className="flex-shrink-0 text-xs text-foreground-subtle">
                          {formatRelativeTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    {lastMsgPreview && (
                      <p
                        className={`truncate text-sm mt-0.5 ${
                          conv.unread_count > 0 ? "text-foreground font-medium" : "text-foreground-subtle"
                        }`}
                      >
                        {lastMsgPreview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
