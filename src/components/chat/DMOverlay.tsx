"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { X, Send, Loader2, Minus, Lock, Shield } from "lucide-react";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPrivateKey,
  encryptMessage,
  decryptMessage,
  storeKeyPair,
  getStoredPrivateKey,
  getOrDeriveSharedKey,
} from "@/lib/encryption";
import { moderateText } from "@/lib/moderation";

type DMMessage = {
  id: string;
  content: string;
  encrypted_content?: string;
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
    public_key?: string;
  };
};

type Props = {
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onMinimize: () => void;
  slotPosition?: number; // 0, 1, or 2 for fixed positions
  isMinimized?: boolean;
};

// Fixed slot positions - positioned inside chat panel, above input area
// Slots are arranged from right to left
const SLOT_OFFSETS = [
  { right: 20, bottom: 80 },   // Slot 0: rightmost
  { right: 350, bottom: 80 },  // Slot 1: middle
  { right: 680, bottom: 80 },  // Slot 2: leftmost
];

export default function DMOverlay({
  conversation,
  currentUserId,
  onClose,
  onMinimize,
  slotPosition = 0,
  isMinimized = false,
}: Props) {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  const labels = {
    en: {
      placeholder: "Type a message...",
      encrypted: "End-to-end encrypted",
      setupEncryption: "Setting up encryption...",
      today: "Today",
      moderated: "Message filtered",
    },
    el: {
      placeholder: "Γράψτε ένα μήνυμα...",
      encrypted: "Κρυπτογραφημένο end-to-end",
      setupEncryption: "Ρύθμιση κρυπτογράφησης...",
      today: "Σήμερα",
      moderated: "Μήνυμα φιλτραρισμένο",
    },
  }[lang];

  // Initialize encryption
  useEffect(() => {
    const setupEncryption = async () => {
      try {
        // Check if we have stored private key
        let storedPrivateKey = await getStoredPrivateKey(currentUserId);
        let myPrivateKey: CryptoKey;

        if (storedPrivateKey) {
          myPrivateKey = await importPrivateKey(storedPrivateKey);
        } else {
          // Generate new key pair
          const keyPair = await generateKeyPair();
          myPrivateKey = keyPair.privateKey;
          const myPublicKeyBase64 = await exportPublicKey(keyPair.publicKey);
          const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
          
          // Store private key locally
          await storeKeyPair(currentUserId, privateKeyBase64);
          
          // Upload public key to server
          await fetch("/api/user/public-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_key: myPublicKeyBase64 }),
          });
        }

        setPrivateKey(myPrivateKey);

        // Get other user's public key
        if (conversation.other_user.public_key) {
          const derived = await getOrDeriveSharedKey(
            myPrivateKey,
            conversation.other_user.public_key,
            conversation.id
          );
          setSharedKey(derived);
          setIsEncrypted(true);
        }
      } catch (error) {
        console.error("Encryption setup failed:", error);
        // Continue without encryption
      }
    };

    setupEncryption();
  }, [currentUserId, conversation.id, conversation.other_user.public_key]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/dm/conversations/${conversation.id}/messages`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error fetching DM messages:", err);
    }
  }, [conversation.id]);

  // Decrypt messages when shared key is available
  useEffect(() => {
    const decryptAll = async () => {
      if (!sharedKey) return;
      
      const newDecrypted = new Map<string, string>();
      for (const msg of messages) {
        if (msg.encrypted_content) {
          try {
            const decrypted = await decryptMessage(msg.encrypted_content, sharedKey);
            newDecrypted.set(msg.id, decrypted);
          } catch {
            newDecrypted.set(msg.id, msg.content || "[Unable to decrypt]");
          }
        } else {
          newDecrypted.set(msg.id, msg.content);
        }
      }
      setDecryptedMessages(newDecrypted);
    };

    decryptAll();
  }, [messages, sharedKey]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));
  }, [fetchMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, decryptedMessages]);

  // Subscribe to new messages
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`dm-overlay-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, fetchMessages]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, textarea, input")) return;
    
    // If not yet dragged, initialize position from current element position
    if (!hasBeenDragged && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      setPos({ x: rect.left, y: rect.top });
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setDragOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      });
    }
    
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setHasBeenDragged(true);
      // Allow free dragging anywhere on screen
      setPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    // Content moderation
    const modResult = moderateText(newMessage);
    if (modResult.hasIllegalContent) {
      alert(lang === "el" ? "Αυτό το μήνυμα δεν μπορεί να σταλεί" : "This message cannot be sent");
      return;
    }

    const contentToSend = modResult.filteredContent;

    setIsSending(true);
    try {
      let encryptedContent: string | undefined;
      
      // Encrypt if we have a shared key
      if (sharedKey && isEncrypted) {
        encryptedContent = await encryptMessage(contentToSend, sharedKey);
      }

      const res = await fetch(`/api/dm/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: encryptedContent ? "[Encrypted]" : contentToSend,
          encrypted_content: encryptedContent,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        textareaRef.current?.focus();
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending DM:", err);
    }
    setIsSending(false);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(lang === "el" ? "el-GR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const otherUser = conversation.other_user;

  // Minimized state - just show header bar
  if (isMinimized) {
    return (
      <div
        ref={overlayRef}
        className="fixed z-50 w-64 rounded-t-xl bg-navy-soft shadow-lg cursor-pointer transition-colors duration-300"
        style={{ right: "20px", bottom: "0" }}
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2 px-3 py-2 text-white">
          {otherUser.avatar_url ? (
            <Image
              src={otherUser.avatar_url}
              alt={otherUser.name || "User"}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-medium">
              {(otherUser.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="flex-1 truncate text-sm font-medium">
            {otherUser.name || (lang === "el" ? "Άγνωστος" : "Unknown")}
          </span>
          {isEncrypted && <Lock className="h-3 w-3" />}
        </div>
      </div>
    );
  }

  // Get slot position or use dragged position
  const slotOffset = SLOT_OFFSETS[slotPosition] || SLOT_OFFSETS[0];
  const positionStyle = hasBeenDragged
    ? { left: pos.x, top: pos.y }
    : { right: slotOffset.right, bottom: slotOffset.bottom };

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 flex h-96 w-80 flex-col overflow-hidden rounded-xl bg-card shadow-2xl border border-border transition-colors duration-300"
      style={positionStyle}
    >
      {/* Header - draggable, shows username prominently */}
      <div
        className="flex items-center gap-3 bg-navy-soft px-3 py-3 text-white cursor-move select-none transition-colors duration-300"
        onMouseDown={handleMouseDown}
      >
        {otherUser.avatar_url ? (
          <Image
            src={otherUser.avatar_url}
            alt={otherUser.name || "User"}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover border-2 border-white/30"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-semibold border-2 border-white/30">
            {(otherUser.name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-base font-semibold">
            {otherUser.name || (lang === "el" ? "Άγνωστος" : "Unknown")}
          </p>
          {isEncrypted && (
            <p className="flex items-center gap-1 text-xs text-white/70">
              <Lock className="h-3 w-3" />
              {labels.encrypted}
            </p>
          )}
        </div>
        <button
          onClick={onMinimize}
          className="rounded p-1.5 hover:bg-white/20 transition"
          title={lang === "el" ? "Ελαχιστοποίηση" : "Minimize"}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1.5 hover:bg-white/20 transition"
          title={lang === "el" ? "Κλείσιμο" : "Close"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-background-secondary">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" />
          </div>
        ) : (
          <>
            {/* Encryption notice */}
            {isEncrypted && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                <Shield className="h-4 w-4" />
                <span>{labels.encrypted}</span>
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const displayContent = decryptedMessages.get(msg.id) || msg.content;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm transition-colors duration-300 ${
                      isOwn
                        ? "bg-navy-soft text-white rounded-br-md"
                        : "bg-card text-foreground rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{displayContent}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn ? "text-white/60" : "text-foreground-subtle"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                      {msg.encrypted_content && (
                        <Lock className="inline ml-1 h-2.5 w-2.5" />
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-2 transition-colors duration-300">
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
            className="flex-1 resize-none rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none transition-colors duration-300"
            style={{ maxHeight: "80px" }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full bg-navy-soft p-2 text-white hover:opacity-90 disabled:opacity-50 transition-colors duration-300"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
