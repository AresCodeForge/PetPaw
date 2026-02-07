"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  MessageCircle,
  Search,
  Trash2,
  Ban,
  Clock,
  User,
  Filter,
  RefreshCw,
  X,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import Image from "next/image";

type ChatRoom = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    email?: string;
    avatar_url: string | null;
  };
  room?: ChatRoom;
};

type ChatBan = {
  id: string;
  user_id: string;
  room_id: string | null;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    email?: string;
    avatar_url: string | null;
  };
  banned_by_user?: {
    name: string | null;
  };
  room?: ChatRoom | null;
};

type ModerationEntry = {
  id: string;
  user_id: string;
  content_type: string;
  content_preview: string | null;
  flags: string[];
  action_taken: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user: { id: string; name: string | null; avatar_url: string | null } | null;
  reviewer: { name: string | null } | null;
};

export default function AdminChatPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"messages" | "bans" | "flagged" | "audit">("messages");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bans, setBans] = useState<ChatBan[]>([]);
  const [flaggedEntries, setFlaggedEntries] = useState<ModerationEntry[]>([]);
  const [auditEntries, setAuditEntries] = useState<ModerationEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<string>("24");
  const [banRoom, setBanRoom] = useState<string>("global");

  const dateLocale = lang === "el" ? el : enUS;

  const labels = {
    en: {
      title: "Chat Moderation",
      description: "Monitor and moderate community chat",
      messages: "Messages",
      bans: "Banned Users",
      allRooms: "All Rooms",
      searchMessages: "Search messages...",
      noMessages: "No messages found",
      noBans: "No active bans",
      deleteMessage: "Delete message",
      banUser: "Ban user",
      unban: "Remove ban",
      refresh: "Refresh",
      global: "Global (all rooms)",
      room: "Room",
      reason: "Reason",
      duration: "Duration",
      permanent: "Permanent",
      hours: "hours",
      banUserTitle: "Ban User",
      cancel: "Cancel",
      confirm: "Confirm Ban",
      bannedBy: "Banned by",
      expires: "Expires",
      never: "Never (permanent)",
      flagged: "Flagged Content",
      audit: "Audit Log",
      noFlagged: "No flagged content",
      noAudit: "No moderation entries",
      approve: "Approve",
      block: "Block",
      contentPreview: "Content",
      action: "Action",
      flags: "Flags",
      reviewedBy: "Reviewed by",
    },
    el: {
      title: "Διαχείριση Chat",
      description: "Παρακολούθηση και διαχείριση κοινοτικής συνομιλίας",
      messages: "Μηνύματα",
      bans: "Αποκλεισμένοι",
      allRooms: "Όλα τα Δωμάτια",
      searchMessages: "Αναζήτηση μηνυμάτων...",
      noMessages: "Δεν βρέθηκαν μηνύματα",
      noBans: "Δεν υπάρχουν ενεργοί αποκλεισμοί",
      deleteMessage: "Διαγραφή μηνύματος",
      banUser: "Αποκλεισμός χρήστη",
      unban: "Άρση αποκλεισμού",
      refresh: "Ανανέωση",
      global: "Γενικός (όλα τα δωμάτια)",
      room: "Δωμάτιο",
      reason: "Αιτία",
      duration: "Διάρκεια",
      permanent: "Μόνιμος",
      hours: "ώρες",
      banUserTitle: "Αποκλεισμός Χρήστη",
      cancel: "Ακύρωση",
      confirm: "Επιβεβαίωση",
      bannedBy: "Αποκλείστηκε από",
      expires: "Λήγει",
      never: "Ποτέ (μόνιμος)",
      flagged: "Επισημασμένο Περιεχόμενο",
      audit: "Αρχείο Ελέγχου",
      noFlagged: "Δεν υπάρχει επισημασμένο περιεχόμενο",
      noAudit: "Δεν υπάρχουν καταχωρήσεις εποπτείας",
      approve: "Έγκριση",
      block: "Αποκλεισμός",
      contentPreview: "Περιεχόμενο",
      action: "Ενέργεια",
      flags: "Σημαίες",
      reviewedBy: "Εξετάστηκε από",
    },
  }[lang];

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/chat/rooms");
        const data = await res.json();
        if (res.ok) {
          setRooms(data.rooms);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
      }
    };
    fetchRooms();
  }, []);

  // Fetch messages for admin
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch messages from all rooms or selected room
      const roomsToFetch = selectedRoom === "all" 
        ? rooms.map(r => r.slug) 
        : [selectedRoom];
      
      const allMessages: ChatMessage[] = [];
      
      for (const slug of roomsToFetch) {
        const res = await fetch(`/api/chat/rooms/${slug}/messages?limit=100`);
        const data = await res.json();
        if (res.ok) {
          const room = rooms.find(r => r.slug === slug);
          const messagesWithRoom = data.messages.map((m: ChatMessage) => ({
            ...m,
            room,
          }));
          allMessages.push(...messagesWithRoom);
        }
      }

      // Sort by date descending
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Filter by search query
      const filtered = searchQuery
        ? allMessages.filter(m => 
            m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allMessages;
      
      setMessages(filtered.slice(0, 100));
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
    setIsLoading(false);
  }, [rooms, selectedRoom, searchQuery]);

  // Fetch bans
  const fetchBans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/chat/bans?active=true");
      const data = await res.json();
      if (res.ok) {
        setBans(data.bans);
      }
    } catch (err) {
      console.error("Error fetching bans:", err);
    }
    setIsLoading(false);
  }, []);

  // Fetch flagged content (pending review)
  const fetchFlagged = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation?action=pending_review");
      const data = await res.json();
      if (res.ok) {
        setFlaggedEntries(data.entries);
      }
    } catch (err) {
      console.error("Error fetching flagged content:", err);
    }
    setIsLoading(false);
  }, []);

  // Fetch audit log (all entries)
  const fetchAudit = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation?action=all&limit=100");
      const data = await res.json();
      if (res.ok) {
        setAuditEntries(data.entries);
      }
    } catch (err) {
      console.error("Error fetching audit log:", err);
    }
    setIsLoading(false);
  }, []);

  // Review flagged content
  const handleReviewFlagged = async (entryId: string, action: "allowed" | "blocked") => {
    try {
      const res = await fetch(`/api/admin/moderation/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_taken: action }),
      });
      if (res.ok) {
        setFlaggedEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch (err) {
      console.error("Error reviewing flagged content:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (rooms.length > 0) {
      if (activeTab === "messages") {
        fetchMessages();
      } else if (activeTab === "bans") {
        fetchBans();
      } else if (activeTab === "flagged") {
        fetchFlagged();
      } else if (activeTab === "audit") {
        fetchAudit();
      }
    }
  }, [rooms, activeTab, fetchMessages, fetchBans, fetchFlagged, fetchAudit]);

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(lang === "el" ? "Διαγραφή αυτού του μηνύματος;" : "Delete this message?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/chat/messages/${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // Open ban modal
  const openBanModal = (user: { id: string; name: string }) => {
    setBanTargetUser(user);
    setBanReason("");
    setBanDuration("24");
    setBanRoom("global");
    setShowBanModal(true);
  };

  // Create ban
  const handleCreateBan = async () => {
    if (!banTargetUser) return;
    
    try {
      const res = await fetch("/api/admin/chat/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: banTargetUser.id,
          room_id: banRoom === "global" ? null : banRoom,
          reason: banReason || null,
          duration_hours: banDuration === "permanent" ? null : parseInt(banDuration),
        }),
      });
      
      if (res.ok) {
        setShowBanModal(false);
        if (activeTab === "bans") {
          fetchBans();
        }
      }
    } catch (err) {
      console.error("Error creating ban:", err);
    }
  };

  // Remove ban
  const handleRemoveBan = async (banId: string) => {
    if (!confirm(lang === "el" ? "Άρση αυτού του αποκλεισμού;" : "Remove this ban?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/chat/bans/${banId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBans(prev => prev.filter(b => b.id !== banId));
      }
    } catch (err) {
      console.error("Error removing ban:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
          <p className="text-foreground-subtle">{labels.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-300 ${
              activeTab === "messages"
                ? "border-navy-soft text-navy-soft"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {labels.messages}
          </button>
          <button
            onClick={() => setActiveTab("bans")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-300 ${
              activeTab === "bans"
                ? "border-navy-soft text-navy-soft"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            }`}
          >
            <Ban className="h-4 w-4" />
            {labels.bans}
            {bans.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                {bans.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("flagged")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-300 ${
              activeTab === "flagged"
                ? "border-navy-soft text-navy-soft"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            {labels.flagged}
            {flaggedEntries.length > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                {flaggedEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-300 ${
              activeTab === "audit"
                ? "border-navy-soft text-navy-soft"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            }`}
          >
            <Eye className="h-4 w-4" />
            {labels.audit}
          </button>
        </div>

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                <input
                  type="text"
                  placeholder={labels.searchMessages}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-navy-soft focus:outline-none transition-colors duration-300"
                />
              </div>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm focus:border-navy-soft focus:outline-none transition-colors duration-300"
              >
                <option value="all">{labels.allRooms}</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.slug}>
                    {lang === "el" ? room.name_el : room.name_en}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchMessages}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                {labels.refresh}
              </button>
            </div>

            {/* Messages list */}
            <div className="rounded-xl border border-border bg-card transition-colors duration-300">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-navy-soft" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-foreground-subtle">
                  {labels.noMessages}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-4 p-4 transition-colors duration-300 hover:bg-background-secondary/50">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.user?.avatar_url ? (
                          <Image
                            src={message.user.avatar_url}
                            alt={message.user.name || "User"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border text-foreground-muted">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {message.user?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-foreground-subtle">
                            {format(new Date(message.created_at), "PPp", { locale: dateLocale })}
                          </span>
                          {message.room && (
                            <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-muted">
                              {lang === "el" ? message.room.name_el : message.room.name_en}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {message.image_url && (
                          <div className="mt-2">
                            <Image
                              src={message.image_url}
                              alt="Shared"
                              width={200}
                              height={150}
                              className="rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openBanModal({
                            id: message.user_id,
                            name: message.user?.name || "Unknown",
                          })}
                          className="rounded-lg p-2 text-foreground-subtle transition-colors duration-300 hover:bg-orange-50 hover:text-orange-500"
                          title={labels.banUser}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="rounded-lg p-2 text-foreground-subtle transition-colors duration-300 hover:bg-red-50 hover:text-red-500"
                          title={labels.deleteMessage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bans Tab */}
        {activeTab === "bans" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={fetchBans}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                {labels.refresh}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card transition-colors duration-300">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-navy-soft" />
                </div>
              ) : bans.length === 0 ? (
                <div className="py-12 text-center text-foreground-subtle">
                  {labels.noBans}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {bans.map((ban) => (
                    <div key={ban.id} className="flex items-center gap-4 p-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {ban.user?.avatar_url ? (
                          <Image
                            src={ban.user.avatar_url}
                            alt={ban.user.name || "User"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500">
                            <Ban className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {ban.user?.name || "Unknown"}
                          </span>
                          {ban.room ? (
                            <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-muted">
                              {lang === "el" ? ban.room.name_el : ban.room.name_en}
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                              {labels.global}
                            </span>
                          )}
                        </div>
                        {ban.reason && (
                          <p className="text-sm text-foreground-muted mb-1">
                            {labels.reason}: {ban.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-foreground-subtle">
                          <span>
                            {labels.bannedBy}: {ban.banned_by_user?.name || "Admin"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {labels.expires}: {ban.expires_at 
                              ? format(new Date(ban.expires_at), "PPp", { locale: dateLocale })
                              : labels.never
                            }
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleRemoveBan(ban.id)}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-600 hover:bg-green-100"
                      >
                        {labels.unban}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flagged Content Tab */}
        {activeTab === "flagged" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={fetchFlagged}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                {labels.refresh}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card transition-colors duration-300">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-navy-soft" />
                </div>
              ) : flaggedEntries.length === 0 ? (
                <div className="py-12 text-center text-foreground-subtle">
                  <Shield className="mx-auto h-12 w-12 text-foreground-muted mb-3" />
                  {labels.noFlagged}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {flaggedEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-4 transition-colors duration-300 hover:bg-background-secondary/50">
                      {/* User avatar */}
                      <div className="flex-shrink-0">
                        {entry.user?.avatar_url ? (
                          <Image
                            src={entry.user.avatar_url}
                            alt={entry.user.name || "User"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                            <Shield className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {entry.user?.name || "Unknown"}
                          </span>
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                            {entry.action_taken}
                          </span>
                          <span className="text-xs text-foreground-subtle">
                            {format(new Date(entry.created_at), "PPp", { locale: dateLocale })}
                          </span>
                        </div>
                        {entry.content_preview && (
                          <p className="text-sm text-foreground-muted bg-background-secondary rounded-lg p-2 mb-2">
                            &quot;{entry.content_preview}&quot;
                          </p>
                        )}
                        {entry.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.flags.map((flag, i) => (
                              <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReviewFlagged(entry.id, "allowed")}
                          className="rounded-lg p-2 text-green-500 hover:bg-green-50 transition-colors duration-300"
                          title={labels.approve}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReviewFlagged(entry.id, "blocked")}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors duration-300"
                          title={labels.block}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openBanModal({
                            id: entry.user_id,
                            name: entry.user?.name || "Unknown",
                          })}
                          className="rounded-lg p-2 text-orange-500 hover:bg-orange-50 transition-colors duration-300"
                          title={labels.banUser}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={fetchAudit}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                {labels.refresh}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card transition-colors duration-300">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-navy-soft" />
                </div>
              ) : auditEntries.length === 0 ? (
                <div className="py-12 text-center text-foreground-subtle">
                  {labels.noAudit}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditEntries.map((entry) => {
                    const actionColor = {
                      allowed: "bg-green-100 text-green-700",
                      filtered: "bg-yellow-100 text-yellow-700",
                      blocked: "bg-red-100 text-red-700",
                      pending_review: "bg-orange-100 text-orange-700",
                    }[entry.action_taken] || "bg-gray-100 text-gray-600";

                    return (
                      <div key={entry.id} className="flex items-start gap-4 p-4">
                        <div className="flex-shrink-0">
                          {entry.user?.avatar_url ? (
                            <Image
                              src={entry.user.avatar_url}
                              alt={entry.user.name || "User"}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-border text-foreground-muted">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm text-foreground">
                              {entry.user?.name || "Unknown"}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}>
                              {entry.action_taken}
                            </span>
                            <span className="text-xs text-foreground-subtle">
                              {format(new Date(entry.created_at), "PPp", { locale: dateLocale })}
                            </span>
                          </div>
                          {entry.content_preview && (
                            <p className="text-xs text-foreground-muted line-clamp-2">
                              {entry.content_preview}
                            </p>
                          )}
                          {entry.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.flags.map((flag, i) => (
                                <span key={i} className="rounded bg-background-secondary px-1.5 py-0.5 text-[10px] text-foreground-subtle">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                          {entry.reviewer && (
                            <p className="text-xs text-foreground-subtle mt-1">
                              {labels.reviewedBy}: {entry.reviewer.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ban Modal */}
        {showBanModal && banTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-orange-500">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">{labels.banUserTitle}</h3>
                </div>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="rounded-full p-1 transition-colors duration-300 hover:bg-background-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-foreground-muted">
                {lang === "el" 
                  ? `Αποκλεισμός χρήστη: ${banTargetUser.name}`
                  : `Ban user: ${banTargetUser.name}`
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {labels.room}
                  </label>
                  <select
                    value={banRoom}
                    onChange={(e) => setBanRoom(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 transition-colors duration-300 focus:border-navy-soft focus:outline-none"
                  >
                    <option value="global">{labels.global}</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {lang === "el" ? room.name_el : room.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {labels.duration}
                  </label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 transition-colors duration-300 focus:border-navy-soft focus:outline-none"
                  >
                    <option value="1">1 {labels.hours}</option>
                    <option value="6">6 {labels.hours}</option>
                    <option value="24">24 {labels.hours}</option>
                    <option value="72">72 {labels.hours}</option>
                    <option value="168">1 week</option>
                    <option value="permanent">{labels.permanent}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {labels.reason}
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder={lang === "el" ? "Προαιρετική αιτία..." : "Optional reason..."}
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2 transition-colors duration-300 focus:border-navy-soft focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-foreground-muted transition-colors duration-300 hover:bg-background-secondary"
                >
                  {labels.cancel}
                </button>
                <button
                  onClick={handleCreateBan}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
                >
                  {labels.confirm}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
