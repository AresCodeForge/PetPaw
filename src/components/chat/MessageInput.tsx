"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Image as ImageIcon, X, Reply, GripHorizontal } from "lucide-react";
import type { ChatMessage } from "./MessageBubble";

type Props = {
  roomSlug: string;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onSend: (content: string, imageUrl?: string, replyToId?: string, mentions?: string[]) => Promise<void>;
  disabled?: boolean;
  onTyping?: () => void;
};

export default function MessageInput({
  roomSlug,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
  onTyping,
}: Props) {
  const { lang } = useLanguage();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const labels = {
    en: {
      placeholder: "Type a message...",
      send: "Send",
      uploadImage: "Upload image",
      replyingTo: "Replying to",
      cancel: "Cancel",
    },
    el: {
      placeholder: "Γράψτε ένα μήνυμα...",
      send: "Αποστολή",
      uploadImage: "Ανέβασμα εικόνας",
      replyingTo: "Απάντηση σε",
      cancel: "Ακύρωση",
    },
  }[lang];

  // Auto-resize textarea (respects expanded height)
  useEffect(() => {
    if (textareaRef.current) {
      if (expandedHeight) {
        textareaRef.current.style.height = `${expandedHeight}px`;
      } else {
        textareaRef.current.style.height = "32px";
        const scrollH = textareaRef.current.scrollHeight;
        if (scrollH > 32) {
          textareaRef.current.style.height = `${Math.min(scrollH, 120)}px`;
        }
      }
    }
  }, [content, expandedHeight]);

  // Focus textarea when reply is set
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  // Drag-to-resize handlers (desktop only)
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const textarea = textareaRef.current;
    if (!textarea) return;
    dragRef.current = { startY: e.clientY, startH: textarea.offsetHeight };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY; // drag up = increase
      const newH = Math.max(32, Math.min(dragRef.current.startH + delta, 400));
      setExpandedHeight(newH);
    };

    const handleUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, []);

  const handleContentChange = (value: string) => {
    setContent(value);
    onTyping?.();
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !imageUrl) || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(
        content.trim(),
        imageUrl || undefined,
        replyTo?.id,
      );
      setContent("");
      setImageUrl(null);
      setExpandedHeight(null); // reset after send
      onCancelReply?.();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(lang === "el" ? "Μόνο εικόνες επιτρέπονται" : "Only images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === "el" ? "Η εικόνα πρέπει να είναι κάτω από 5MB" : "Image must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(lang === "el" ? "Αποτυχία ανεβάσματος" : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-border bg-card px-3 py-2 transition-colors duration-150">
      {/* Drag handle - desktop only */}
      <div
        className="hidden md:flex items-center justify-center -mt-1 mb-1 cursor-ns-resize select-none group"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal className="h-3.5 w-5 text-border group-hover:text-foreground-muted transition-colors" />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-border/30 px-3 py-1.5">
          <Reply className="h-3.5 w-3.5 text-navy-soft shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-navy-soft font-medium">
              {labels.replyingTo} {replyTo.user?.name || "Unknown"}
            </span>
            <p className="text-xs text-foreground-muted truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-0.5 rounded hover:bg-border text-foreground-subtle transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imageUrl && (
        <div className="mb-2 relative inline-block">
          <img src={imageUrl} alt="Upload preview" className="h-16 w-auto rounded-lg" />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-1.5">
        {/* Image upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-border/30 disabled:opacity-50 transition-colors duration-150 mb-px"
          title={labels.uploadImage}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={labels.placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm leading-5 text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft disabled:opacity-50 transition-colors duration-150"
          style={{
            minHeight: "32px",
            maxHeight: expandedHeight ? `${expandedHeight}px` : "120px",
          }}
        />

        {/* Send */}
        <button
          onClick={handleSubmit}
          disabled={(!content.trim() && !imageUrl) || isSending || disabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-soft text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 mb-px"
          title={labels.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Character count */}
      {content.length > 1800 && (
        <div className={`mt-1 text-xs ${content.length > 2000 ? "text-red-500" : "text-foreground-subtle"}`}>
          {content.length}/2000
        </div>
      )}
    </div>
  );
}
