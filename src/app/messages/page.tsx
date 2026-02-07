"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { MessageCircle, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import ConversationList from "@/components/messages/ConversationList";
import ChatMessages from "@/components/messages/ChatMessages";
import MessageInput from "@/components/messages/MessageInput";
import type { ConversationWithDetails } from "@/app/api/messages/route";
import type { MessageRow } from "@/app/api/messages/[conversationId]/route";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    listing_id: string;
    listing: { id: string; pet_name: string; title: string };
    other_user: { id: string; name: string | null; avatar_url: string | null; is_shelter: boolean; shelter_name: string | null } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // New conversation from listing
  const listingId = searchParams.get("listing");

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setActiveConversation(data.conversation);
        
        // Mark messages as read
        await fetch("/api/messages/read", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ conversation_id: conversationId }),
        });
        
        // Update unread count in list
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      await fetchConversations();
      setIsLoading(false);
    };
    checkAuth();
  }, [router, fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as MessageRow;
          
          // Only add if not from current user (we already add our own messages optimistically)
          if (newMessage.sender_id !== user.id) {
            // Fetch sender info
            const { data: sender } = await supabase
              .from("profiles")
              .select("id, name, avatar_url")
              .eq("id", newMessage.sender_id)
              .single();

            setMessages((prev) => {
              // Check if message already exists
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, { ...newMessage, sender }];
            });

            // Mark as read immediately if chat is open
            await fetch("/api/messages/read", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ conversation_id: activeConversationId }),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user]);

  // Realtime subscription for conversation list updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          // Refetch conversations on any change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  // Handle new conversation from listing link
  useEffect(() => {
    if (listingId && conversations.length > 0) {
      // Check if conversation for this listing already exists
      const existingConv = conversations.find((c) => c.listing_id === listingId);
      if (existingConv) {
        setActiveConversationId(existingConv.id);
        setShowMobileChat(true);
      }
    }
  }, [listingId, conversations]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversation_id: activeConversationId,
          listing_id: listingId && !activeConversationId ? listingId : undefined,
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If this was a new conversation, set it as active
        if (!activeConversationId && data.conversation_id) {
          setActiveConversationId(data.conversation_id);
          await fetchConversations();
          router.replace("/messages");
        }
        
        // Add message to list
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            sender: { id: user.id, name: null, avatar_url: null },
          },
        ]);

        // Update conversation in list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === (activeConversationId || data.conversation_id)
              ? {
                  ...c,
                  last_message_at: new Date().toISOString(),
                  last_message: {
                    content,
                    sender_id: user.id,
                    created_at: new Date().toISOString(),
                  },
                }
              : c
          ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setShowMobileChat(true);
  };

  const labels = {
    title: { en: "Messages", el: "Μηνύματα" },
    noConversation: { en: "Select a conversation", el: "Επιλέξτε μια συνομιλία" },
    startNew: { en: "Start a new conversation by contacting a pet listing", el: "Ξεκινήστε μια νέα συνομιλία επικοινωνώντας με μια καταχώρηση" },
    browsePets: { en: "Browse pets", el: "Περιηγηθείτε" },
    newConversation: { en: "New conversation about", el: "Νέα συνομιλία για" },
    back: { en: "Back", el: "Πίσω" },
    viewListing: { en: "View listing", el: "Προβολή καταχώρησης" },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  // New conversation state (from listing link, no existing conversation)
  const isNewConversation = listingId && !activeConversationId;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background transition-colors duration-300">
      {/* Conversation list (sidebar) */}
      <div
        className={`w-full shrink-0 border-r border-border bg-card md:w-80 lg:w-96 transition-colors duration-300 ${
          showMobileChat ? "hidden md:block" : "block"
        }`}
      >
        <div className="border-b border-border p-4">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <MessageCircle className="h-6 w-6 text-navy-soft" />
            {labels.title[lang]}
          </h1>
        </div>
        <div className="h-[calc(100%-73px)] overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId || undefined}
            onSelect={handleSelectConversation}
          />
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`flex flex-1 flex-col ${
          showMobileChat ? "block" : "hidden md:flex"
        }`}
      >
        {activeConversationId || isNewConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-border bg-card p-4 transition-colors duration-300">
              {/* Mobile back button */}
              <button
                onClick={() => {
                  setShowMobileChat(false);
                  setActiveConversationId(null);
                  if (isNewConversation) router.replace("/messages");
                }}
                className="rounded-lg p-2 text-foreground-muted hover:bg-background-secondary transition-colors duration-300 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {activeConversation?.other_user?.avatar_url ? (
                <img
                  src={activeConversation.other_user.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border font-medium text-foreground-muted">
                  {activeConversation?.other_user?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {activeConversation?.other_user?.name || (lang === "el" ? "Ανώνυμος" : "Anonymous")}
                </p>
                <Link
                  href={`/adoptions/${activeConversation?.listing_id}`}
                  className="flex items-center gap-1 text-sm text-navy-soft hover:underline transition-colors duration-300"
                >
                  {activeConversation?.listing?.pet_name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Messages */}
            {isLoadingMessages ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-navy-soft" />
              </div>
            ) : (
              <ChatMessages messages={messages} currentUserId={user?.id || ""} />
            )}

            {/* Message input */}
            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="mb-4 h-16 w-16 text-foreground-subtle" />
            <p className="mb-2 text-lg font-medium text-foreground">{labels.noConversation[lang]}</p>
            <p className="mb-4 text-sm text-foreground-muted">{labels.startNew[lang]}</p>
            <Link
              href="/adoptions"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors duration-300"
            >
              {labels.browsePets[lang]}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
