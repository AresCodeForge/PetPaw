"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import RoomList from "@/components/chat/RoomList";
import ChatRoom from "@/components/chat/ChatRoom";
import OnlineUsersPanel from "@/components/chat/OnlineUsersPanel";
import DMList from "@/components/chat/DMList";
import DMOverlay from "@/components/chat/DMOverlay";
import { Menu, MessageCircle, Loader2, ArrowLeft, PanelLeftClose, PanelLeft, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

type ChatRoomData = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  description_en: string | null;
  description_el: string | null;
  type: string;
  icon: string | null;
  unread_count?: number;
  online_count?: number;
};

type OnlineUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type DMConversationData = {
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

export default function ChatRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { lang } = useLanguage();
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoomData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Right panel state
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // DM state - max 3 windows, each with assigned slot position
  const [showDMPanel, setShowDMPanel] = useState(false);
  const [dmConversations, setDmConversations] = useState<DMConversationData[]>([]);
  const [openDMOverlays, setOpenDMOverlays] = useState<Map<string, { conversation: DMConversationData; isMinimized: boolean; slot: number }>>(new Map());
  
  const MAX_DM_WINDOWS = 3;
  
  // Get next available slot (0, 1, or 2)
  const getNextAvailableSlot = useCallback(() => {
    const usedSlots = new Set(Array.from(openDMOverlays.values()).map(v => v.slot));
    for (let i = 0; i < MAX_DM_WINDOWS; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return -1; // No slots available
  }, [openDMOverlays]);

  const labels = {
    en: {
      title: "Community Chat",
      subtitle: "Connect with fellow pet lovers",
      roomNotFound: "Room not found",
      backToRooms: "Back to rooms",
      signIn: "Sign in to join the conversation",
      signInBtn: "Sign In",
      directMessages: "Messages",
      showUsers: "Show users",
      hideUsers: "Hide users",
    },
    el: {
      title: "Κοινοτική Συνομιλία",
      subtitle: "Συνδεθείτε με άλλους λάτρεις των ζώων",
      roomNotFound: "Το δωμάτιο δεν βρέθηκε",
      backToRooms: "Πίσω στα δωμάτια",
      signIn: "Συνδεθείτε για να συμμετάσχετε στη συζήτηση",
      signInBtn: "Σύνδεση",
      directMessages: "Μηνύματα",
      showUsers: "Εμφάνιση χρηστών",
      hideUsers: "Απόκρυψη χρηστών",
    },
  }[lang];

  // Fetch user and rooms
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // Get current user
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Check if admin
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }

      // Fetch rooms
      try {
        const res = await fetch("/api/chat/rooms");
        const data = await res.json();
        if (res.ok) {
          setRooms(data.rooms);
          // Find the active room by slug
          const room = data.rooms.find((r: ChatRoomData) => r.slug === slug);
          setActiveRoom(room || null);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
      }

      setIsLoading(false);
    };

    init();
  }, [slug]);

  // Handle room selection
  const handleRoomSelect = (newSlug: string) => {
    router.push(`/chat/${newSlug}`);
    setShowMobileSidebar(false);
  };

  // Fetch DM conversations
  const fetchDMConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/dm/conversations");
      const data = await res.json();
      if (res.ok) {
        setDmConversations(data.conversations);
      }
    } catch (err) {
      console.error("Error fetching DM conversations:", err);
    }
  }, [currentUserId]);

  // Start or get DM conversation with a user - opens as overlay
  const handleStartDM = async (userId: string, userName: string | null) => {
    if (!currentUserId) return;
    
    // Check if already open - if so, just unminimize it
    const existingEntry = Array.from(openDMOverlays.entries()).find(
      ([, v]) => v.conversation.other_user.id === userId
    );
    if (existingEntry) {
      setOpenDMOverlays((prev) => {
        const newMap = new Map(prev);
        newMap.set(existingEntry[0], { ...existingEntry[1], isMinimized: false });
        return newMap;
      });
      setShowDMPanel(false);
      return;
    }
    
    // Check if we have room for another window
    const nextSlot = getNextAvailableSlot();
    if (nextSlot === -1) {
      // Max windows reached - alert user
      alert(lang === "el" 
        ? "Μπορείτε να έχετε μόνο 3 ανοιχτές συνομιλίες. Κλείστε μία για να ανοίξετε νέα."
        : "You can only have 3 open conversations. Close one to open a new one."
      );
      return;
    }
    
    try {
      const res = await fetch("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: userId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation as DMConversationData;
        
        // Open as overlay with assigned slot
        setOpenDMOverlays((prev) => {
          const newMap = new Map(prev);
          newMap.set(conv.id, { conversation: conv, isMinimized: false, slot: nextSlot });
          return newMap;
        });
        setShowDMPanel(false);
        fetchDMConversations();
      }
    } catch (err) {
      console.error("Error starting DM:", err);
    }
  };

  // Close DM overlay
  const handleCloseDMOverlay = (convId: string) => {
    setOpenDMOverlays((prev) => {
      const newMap = new Map(prev);
      newMap.delete(convId);
      return newMap;
    });
  };

  // Toggle minimize DM overlay
  const handleToggleMinimizeDM = (convId: string) => {
    setOpenDMOverlays((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(convId);
      if (existing) {
        newMap.set(convId, { ...existing, isMinimized: !existing.isMinimized });
      }
      return newMap;
    });
  };

  // Handle online users update from ChatRoom
  const handleOnlineUsersChange = useCallback((users: OnlineUser[]) => {
    setOnlineUsers(users);
  }, []);

  // Fetch DM conversations when user is available
  useEffect(() => {
    if (currentUserId) {
      fetchDMConversations();
      const interval = setInterval(fetchDMConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, fetchDMConversations]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-180px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <section className="bg-navy-soft py-8 text-white transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors duration-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{labels.title}</h1>
              <p className="mt-1 text-white/80">{labels.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat container */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative flex h-[calc(100vh-300px)] min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-colors duration-300">
          
          {/* Mobile sidebar overlay */}
          {showMobileSidebar && (
            <div
              className="fixed inset-0 z-20 bg-black/30 md:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* Sidebar - Room list (responsive) */}
          <div
            className={`
              fixed inset-y-0 left-0 z-30 w-72 transform bg-card shadow-lg transition-transform duration-300 transition-colors duration-300 md:relative md:z-0 md:shadow-none md:transition-all
              ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}
              ${sidebarCollapsed ? "md:w-0 md:translate-x-0 md:overflow-hidden" : "md:w-72 md:translate-x-0"}
              md:border-r md:border-border
            `}
          >
            <RoomList
              rooms={rooms}
              activeSlug={activeRoom?.slug}
              onRoomSelect={handleRoomSelect}
            />
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeRoom ? (
              <>
                {/* Room header */}
                <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 transition-colors duration-300">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                    className="rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300 md:hidden"
                    title={lang === "el" ? "Δωμάτια" : "Rooms"}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  
                  {/* Desktop collapse toggle */}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden md:block rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300"
                    title={sidebarCollapsed ? (lang === "el" ? "Εμφάνιση δωματίων" : "Show rooms") : (lang === "el" ? "Απόκρυψη δωματίων" : "Hide rooms")}
                  >
                    {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground truncate">
                      {lang === "el" ? activeRoom.name_el : activeRoom.name_en}
                    </h2>
                    <p className="text-sm text-foreground-subtle truncate">
                      {lang === "el" ? activeRoom.description_el : activeRoom.description_en}
                    </p>
                  </div>

                  {/* DM button - shows unread count */}
                  {currentUserId && (
                    <button
                      onClick={() => setShowDMPanel(!showDMPanel)}
                      className={`relative rounded-lg p-2 transition-colors duration-300 ${
                        showDMPanel ? "bg-navy-soft text-white" : "text-foreground-muted hover:bg-border/30"
                      }`}
                      title={labels.directMessages}
                    >
                      <MessageSquare className="h-5 w-5" />
                      {dmConversations.reduce((acc, c) => acc + c.unread_count, 0) > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e07a5f] px-1 text-xs font-bold text-white">
                          {dmConversations.reduce((acc, c) => acc + c.unread_count, 0)}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Toggle right panel button (desktop) */}
                  <button
                    onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                    className="hidden md:block rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300"
                    title={rightPanelCollapsed ? labels.showUsers : labels.hideUsers}
                  >
                    <Users className="h-5 w-5" />
                  </button>
                </div>

                {/* Chat room */}
                {currentUserId ? (
                  <ChatRoom
                    roomSlug={activeRoom.slug}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onOnlineUsersChange={handleOnlineUsersChange}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                    <MessageCircle className="h-16 w-16 text-foreground-muted" />
                    <p className="text-foreground-subtle">{labels.signIn}</p>
                    <button
                      onClick={() => router.push("/login")}
                      className="rounded-full bg-navy-soft px-6 py-2 text-white hover:opacity-90 transition-colors duration-300"
                    >
                      {labels.signInBtn}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <MessageCircle className="h-16 w-16 text-foreground-muted" />
                <p className="text-foreground-subtle">{labels.roomNotFound}</p>
                <Link
                  href="/chat"
                  className="rounded-full bg-navy-soft px-6 py-2 text-white hover:opacity-90 transition-colors duration-300"
                >
                  {labels.backToRooms}
                </Link>
              </div>
            )}
          </div>

          {/* DM Panel (overlay on mobile, side panel on desktop) */}
          {showDMPanel && currentUserId && (
            <>
              {/* Mobile overlay */}
              <div
                className="fixed inset-0 z-20 bg-black/30 md:hidden"
                onClick={() => setShowDMPanel(false)}
              />
              <div className="fixed inset-y-0 right-0 z-30 w-80 md:relative md:z-0 md:w-72">
                <DMList
                  conversations={dmConversations}
                  activeConversationId={undefined}
                  currentUserId={currentUserId}
                  onSelectConversation={(conv) => {
                    // Check if already open
                    if (openDMOverlays.has(conv.id)) {
                      setOpenDMOverlays((prev) => {
                        const newMap = new Map(prev);
                        const existing = prev.get(conv.id)!;
                        newMap.set(conv.id, { ...existing, isMinimized: false });
                        return newMap;
                      });
                      setShowDMPanel(false);
                      return;
                    }
                    
                    // Check for available slot
                    const nextSlot = getNextAvailableSlot();
                    if (nextSlot === -1) {
                      alert(lang === "el" 
                        ? "Μπορείτε να έχετε μόνο 3 ανοιχτές συνομιλίες. Κλείστε μία για να ανοίξετε νέα."
                        : "You can only have 3 open conversations. Close one to open a new one."
                      );
                      return;
                    }
                    
                    // Open as overlay with assigned slot
                    setOpenDMOverlays((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(conv.id, { conversation: conv, isMinimized: false, slot: nextSlot });
                      return newMap;
                    });
                    setShowDMPanel(false);
                  }}
                  onClose={() => setShowDMPanel(false)}
                />
              </div>
            </>
          )}

          {/* Right panel - Online users (desktop only, when not showing DM panel) */}
          {!showDMPanel && activeRoom && currentUserId && (
            <div className="hidden md:block">
              <OnlineUsersPanel
                users={onlineUsers}
                currentUserId={currentUserId}
                isCollapsed={rightPanelCollapsed}
                onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                onStartDM={handleStartDM}
              />
            </div>
          )}
        </div>
      </div>

      {/* DM Overlays - floating windows with fixed slot positions */}
      {currentUserId && Array.from(openDMOverlays.entries()).map(([convId, { conversation, isMinimized, slot }]) => (
        <DMOverlay
          key={convId}
          conversation={conversation}
          currentUserId={currentUserId}
          onClose={() => handleCloseDMOverlay(convId)}
          onMinimize={() => handleToggleMinimizeDM(convId)}
          isMinimized={isMinimized}
          slotPosition={slot}
        />
      ))}
    </div>
  );
}
