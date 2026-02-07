"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Loader2 } from "lucide-react";

type Props = {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
};

export default function MessageInput({ onSend, disabled }: Props) {
  const { lang } = useLanguage();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4 transition-colors duration-300">
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "el" ? "Γράψτε ένα μήνυμα..." : "Type a message..."}
          disabled={disabled || isSending}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background-secondary px-4 py-2.5 text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft disabled:opacity-50 transition-colors duration-300"
        />
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-soft text-white transition-colors duration-300 hover:opacity-90 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
}
