"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import type { ChatMessage } from "./MessageBubble";
import { Loader2 } from "lucide-react";

type OnlineUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type Props = {
  roomSlug: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onOnlineUsersChange?: (users: OnlineUser[]) => void;
};

export default function ChatRoom({ roomSlug, currentUserId, isAdmin, onOnlineUsersChange }: Props) {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  // Presence summary tracking
  const prevUsersRef = useRef<Set<string>>(new Set());
  const userNamesRef = useRef<Map<string, string>>(new Map()); // id -> name (all seen)
  const joinedBufferRef = useRef<Map<string, string>>(new Map()); // id -> name
  const leftBufferRef = useRef<Map<string, string>>(new Map());   // id -> name

  const labels = {
    en: {
      loading: "Loading messages...",
      error: "Failed to load messages",
    },
    el: {
      loading: "Φόρτωση μηνυμάτων...",
      error: "Αποτυχία φόρτωσης μηνυμάτων",
    },
  }[lang];

  // Fetch messages
  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const url = `/api/chat/rooms/${roomSlug}/messages${before ? `?before=${before}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      if (before) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setHasMore(data.has_more);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(labels.error);
    }
  }, [roomSlug, labels.error]);

  // Fetch online users + track joins/leaves
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/presence?room_slug=${roomSlug}`);
      const data = await res.json();
      if (res.ok) {
        const users: OnlineUser[] = data.users;
        onOnlineUsersChange?.(users);

        // Detect joins & leaves
        const currentIds = new Set(users.map((u) => u.id));
        const prevIds = prevUsersRef.current;

        // Update name map
        for (const u of users) {
          userNamesRef.current.set(u.id, u.name || "?");
        }

        // Only track diffs after the first poll (prevIds empty = initial load)
        if (prevIds.size > 0) {
          for (const u of users) {
            if (!prevIds.has(u.id)) {
              joinedBufferRef.current.set(u.id, u.name || "?");
              leftBufferRef.current.delete(u.id);
            }
          }
          for (const id of prevIds) {
            if (!currentIds.has(id)) {
              const name = userNamesRef.current.get(id) || "?";
              leftBufferRef.current.set(id, name);
              joinedBufferRef.current.delete(id);
            }
          }
        }

        prevUsersRef.current = currentIds;
      }
    } catch (err) {
      console.error("Error fetching presence:", err);
    }
  }, [roomSlug, onOnlineUsersChange]);

  // Update presence heartbeat
  const updatePresence = useCallback(async () => {
    if (!currentUserId) return;
    try {
      await fetch("/api/chat/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_slug: roomSlug, is_online: true }),
      });
    } catch (err) {
      console.error("Error updating presence:", err);
    }
  }, [roomSlug, currentUserId]);

  // Debounced presence fetch — coalesces rapid-fire realtime events into one API call
  const presenceFetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchOnlineUsers = useCallback(() => {
    if (presenceFetchTimerRef.current) return; // already scheduled
    presenceFetchTimerRef.current = setTimeout(() => {
      presenceFetchTimerRef.current = null;
      fetchOnlineUsers();
    }, 500); // 500ms debounce
  }, [fetchOnlineUsers]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    prevUsersRef.current = new Set();
    userNamesRef.current = new Map();
    joinedBufferRef.current = new Map();
    leftBufferRef.current = new Map();
    
    Promise.all([fetchMessages(), fetchOnlineUsers()])
      .finally(() => setIsLoading(false));

    // Update presence immediately and then every 60 seconds (fallback; realtime handles fast updates)
    if (currentUserId) {
      updatePresence();
      presenceIntervalRef.current = setInterval(updatePresence, 60000);
    }

    // Fallback poll for online users every 60 seconds (realtime is primary)
    const presencePollInterval = setInterval(fetchOnlineUsers, 60000);

    // Flush presence summary every 2 minutes
    const summaryInterval = setInterval(() => {
      const joined = Array.from(joinedBufferRef.current.values());
      const left = Array.from(leftBufferRef.current.values());

      if (joined.length === 0 && left.length === 0) return;

      // Build summary lines
      const lines: string[] = [];
      if (joined.length > 0) lines.push(`__joined__:${joined.join(",")}`);
      if (left.length > 0) lines.push(`__left__:${left.join(",")}`);

      const summaryMsg: ChatMessage = {
        id: `presence-${Date.now()}`,
        room_id: "",
        user_id: "",
        content: lines.join("\n"),
        image_url: null,
        reply_to_id: null,
        mentions: [],
        is_deleted: false,
        created_at: new Date().toISOString(),
        message_type: "system",
        user: null,
        reply_to: null,
        reactions: [],
      };

      setMessages((prev) => [...prev, summaryMsg]);

      // Clear buffers
      joinedBufferRef.current = new Map();
      leftBufferRef.current = new Map();
    }, 120000); // 2 minutes

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      if (presenceFetchTimerRef.current) {
        clearTimeout(presenceFetchTimerRef.current);
      }
      clearInterval(presencePollInterval);
      clearInterval(summaryInterval);
      
      // Mark user as offline when leaving
      if (currentUserId) {
        fetch("/api/chat/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_slug: roomSlug, is_online: false }),
        }).catch(() => {});
      }
    };
  }, [roomSlug, currentUserId, fetchMessages, fetchOnlineUsers, updatePresence]);

  // Set up real-time subscriptions
  useEffect(() => {
    const supabase = supabaseRef.current;

    // ── Messages: instant new messages + deletions ──
    const messagesChannel = supabase
      .channel(`room-${roomSlug}-messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async () => {
          const res = await fetch(`/api/chat/rooms/${roomSlug}/messages?limit=1`);
          const data = await res.json();
          if (res.ok && data.messages.length > 0) {
            const newMessage = data.messages[data.messages.length - 1];
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          if ((payload.new as any).is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== (payload.new as any).id));
          }
        }
      )
      .subscribe();

    // ── Reactions: instant reaction updates ──
    const reactionsChannel = supabase
      .channel(`room-${roomSlug}-reactions`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reactions",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    // ── Presence: instant online/offline status ──
    const presenceChannel = supabase
      .channel(`room-${roomSlug}-presence-rt`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence",
        },
        () => {
          // Debounce: multiple presence changes often fire together
          debouncedFetchOnlineUsers();
        }
      )
      .subscribe();

    // ── User roles: instant badge/permission updates ──
    const rolesChannel = supabase
      .channel(`chat-user-roles-rt`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_user_roles",
        },
        () => {
          debouncedFetchOnlineUsers();
        }
      )
      .subscribe();

    // ── Moderation actions: instant status updates (banned/silenced icons) ──
    const moderationChannel = supabase
      .channel(`chat-moderation-rt`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_moderation_actions",
        },
        () => {
          debouncedFetchOnlineUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(moderationChannel);
    };
  }, [roomSlug, fetchMessages, debouncedFetchOnlineUsers]);

  // Load more messages
  const handleLoadMore = async () => {
    if (isLoadingMore || messages.length === 0) return;
    setIsLoadingMore(true);
    await fetchMessages(messages[0].id);
    setIsLoadingMore(false);
  };

  // Send message
  const handleSend = async (content: string, imageUrl?: string, replyToId?: string, mentions?: string[]) => {
    const res = await fetch(`/api/chat/rooms/${roomSlug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        image_url: imageUrl,
        reply_to_id: replyToId,
        mentions,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
  };

  // Add reaction
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, users: [...r.users, currentUserId || ""] }
                  : r
              ),
            };
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, users: [currentUserId || ""] }],
          };
        })
      );
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  // Remove reaction
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: "DELETE",
      });
      
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            reactions: m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentUserId) }
                  : r
              )
              .filter((r) => r.count > 0),
          };
        })
      );
    } catch (err) {
      console.error("Error removing reaction:", err);
    }
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    if (!confirm(lang === "el" ? "Διαγραφή μηνύματος;" : "Delete message?")) return;
    
    try {
      const url = isAdmin
        ? `/api/admin/chat/messages/${messageId}`
        : `/api/chat/rooms/${roomSlug}/messages`;
      
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      
      if (isAdmin) {
        await fetch(url, { method: "DELETE" });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      fetchMessages();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card transition-colors duration-300">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
        <p className="mt-2 text-foreground-subtle">{labels.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card transition-colors duration-300">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card transition-colors duration-300">
      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        onReply={setReplyTo}
        onReact={handleReact}
        onRemoveReaction={handleRemoveReaction}
        onDelete={handleDelete}
      />

      {/* Input */}
      <MessageInput
        roomSlug={roomSlug}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        disabled={!currentUserId}
        onTyping={updatePresence}
      />
    </div>
  );
}
