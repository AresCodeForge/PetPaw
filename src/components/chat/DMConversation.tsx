"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

type DMMessage = {
  id: string;
  content: string;
  image_url: string | null;
  sender_id: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
};

type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  other_user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
};

type Props = {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
};

export default function DMConversation({ conversation, currentUserId, onBack }: Props) {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabaseRef = useRef(createClient());

  const labels = {
    en: {
      loading: "Loading...",
      placeholder: "Type a message...",
      loadMore: "Load older messages",
      today: "Today",
      yesterday: "Yesterday",
    },
    el: {
      loading: "Φόρτωση...",
      placeholder: "Γράψτε ένα μήνυμα...",
      loadMore: "Φόρτωση παλαιότερων",
      today: "Σήμερα",
      yesterday: "Χθες",
    },
  }[lang];

  // Fetch messages
  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const url = `/api/dm/conversations/${conversation.id}/messages${before ? `?before=${before}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        if (before) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMore(data.has_more);
      }
    } catch (err) {
      console.error("Error fetching DM messages:", err);
    }
  }, [conversation.id]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`dm-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async () => {
          // Fetch latest message
          const res = await fetch(`/api/dm/conversations/${conversation.id}/messages?limit=1`);
          const data = await res.json();
          if (res.ok && data.messages.length > 0) {
            const newMsg = data.messages[data.messages.length - 1];
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  // Load more
  const handleLoadMore = async () => {
    if (isLoadingMore || messages.length === 0) return;
    setIsLoadingMore(true);
    await fetchMessages(messages[0].created_at);
    setIsLoadingMore(false);
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/dm/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        textareaRef.current?.focus();
      }
    } catch (err) {
      console.error("Error sending DM:", err);
    }
    setIsSending(false);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return labels.today;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return labels.yesterday;
    } else {
      return date.toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(lang === "el" ? "el-GR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: DMMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = formatDate(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup?.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  const otherUser = conversation.other_user;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {otherUser.avatar_url ? (
          <Image
            src={otherUser.avatar_url}
            alt={otherUser.name || "User"}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-soft text-white font-medium">
            {(otherUser.name || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">
            {otherUser.name || (lang === "el" ? "Άγνωστος" : "Unknown")}
          </h2>
          <p className="text-xs text-foreground-subtle">
            {lang === "el" ? "Ιδιωτική συνομιλία" : "Private conversation"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Load more button */}
        {hasMore && (
          <div className="mb-4 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-sm text-navy-soft hover:underline disabled:opacity-50 transition-colors duration-300"
            >
              {isLoadingMore ? (
                <Loader2 className="inline h-4 w-4 animate-spin" />
              ) : (
                labels.loadMore
              )}
            </button>
          </div>
        )}

        {/* Messages by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-foreground-subtle font-medium">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar for other user */}
                  {!isOwn && (
                    <div className="mr-2 flex-shrink-0">
                      {msg.sender.avatar_url ? (
                        <Image
                          src={msg.sender.avatar_url}
                          alt={msg.sender.name || "User"}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-xs font-medium text-foreground-muted">
                          {(msg.sender.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 transition-colors duration-300 ${
                      isOwn
                        ? "bg-navy-soft text-white rounded-br-md"
                        : "bg-border/30 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.image_url && (
                      <Image
                        src={msg.image_url}
                        alt="Shared image"
                        width={200}
                        height={200}
                        className="rounded-lg mb-2 object-cover"
                      />
                    )}
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? "text-white/70" : "text-foreground-subtle"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4 transition-colors duration-300">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={labels.placeholder}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background-secondary px-4 py-2 text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft transition-colors duration-300"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full bg-navy-soft p-3 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
