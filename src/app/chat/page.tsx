"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase";
import RoomList from "@/components/chat/RoomList";
import ChatRoom from "@/components/chat/ChatRoom";
import OnlineUsersPanel from "@/components/chat/OnlineUsersPanel";
import DMList from "@/components/chat/DMList";
import DMOverlay from "@/components/chat/DMOverlay";
import ChatConsentModal from "@/components/chat/ChatConsentModal";
import ModerationMenu from "@/components/chat/ModerationMenu";
import RoleInfoModal from "@/components/chat/RoleInfoModal";
import RoomManageModal from "@/components/chat/RoomManageModal";
import ModerationToast from "@/components/chat/ModerationToast";
import BannedUsersPanel from "@/components/chat/BannedUsersPanel";
import { type ChatUserRole } from "@/components/chat/RoleBadge";
import { Menu, MessageCircle, Loader2, PanelLeftClose, PanelLeft, MessageSquare, Users, BookOpen, ShieldBan } from "lucide-react";

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
  roles?: ChatUserRole[];
  is_banned?: boolean;
  is_silenced?: boolean;
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

export default function ChatPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoomData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null); // null = loading
  
  // Roles & moderation state
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [moderationTarget, setModerationTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [showRoomManage, setShowRoomManage] = useState(false);
  const [showBannedPanel, setShowBannedPanel] = useState(false);

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
      selectRoom: "Select a room to start chatting",
      signIn: "Sign in to join the conversation",
      signInBtn: "Sign In",
      directMessages: "Messages",
      showUsers: "Show users",
      hideUsers: "Hide users",
    },
    el: {
      selectRoom: "Επιλέξτε ένα δωμάτιο για να ξεκινήσετε",
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
      let userIsAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        userIsAdmin = profile?.role === "admin";
        setIsAdmin(userIsAdmin);

        // Set admin permissions immediately (don't depend on roles API)
        if (userIsAdmin) {
          setCurrentUserPermissions([
            "kick_user", "ban_user", "silence_user", "warn_user",
            "delete_messages", "pin_messages", "manage_room", "assign_roles",
          ]);
        }

        // Check chat consent via API (handles missing columns gracefully)
        try {
          const consentRes = await fetch("/api/chat/consent");
          if (consentRes.ok) {
            const consentData = await consentRes.json();
            setHasConsent(consentData.has_consent);
          } else {
            setHasConsent(true);
          }
        } catch {
          setHasConsent(true);
        }
      } else {
        setHasConsent(true);
      }

      // Fetch rooms + roles in parallel
      try {
        const [roomsRes, rolesRes] = await Promise.all([
          fetch("/api/chat/rooms"),
          fetch("/api/chat/roles"),
        ]);

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(roomsData.rooms);
          if (roomsData.rooms.length > 0 && !activeRoom) {
            setActiveRoom(roomsData.rooms[0]);
          }
        }

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setAllRoles(rolesData.roles ?? []);
        }
      } catch (err) {
        console.error("Error fetching rooms/roles:", err);
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // Handle room selection
  const handleRoomSelect = (slug: string) => {
    const room = rooms.find((r) => r.slug === slug);
    if (room) {
      setActiveRoom(room);
      setShowMobileSidebar(false);
    }
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
        
        // Refresh conversations list
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

  // Handle online users update from ChatRoom — also refresh current user's permissions from roles
  const handleOnlineUsersChange = useCallback((users: OnlineUser[]) => {
    setOnlineUsers(users);
    // Derive permissions from the current user's roles in the presence data
    if (currentUserId) {
      const me = users.find(u => u.id === currentUserId);
      if (me?.roles) {
        const perms = new Set<string>();
        if (isAdmin) {
          ["kick_user", "ban_user", "silence_user", "warn_user", "delete_messages", "pin_messages", "manage_room", "assign_roles"]
            .forEach(p => perms.add(p));
        }
        for (const role of me.roles) {
          for (const p of role.permissions ?? []) perms.add(p);
        }
        setCurrentUserPermissions(Array.from(perms));
      }
    }
  }, [currentUserId, isAdmin]);

  // Fetch rooms helper (reusable)
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Debounced room refresh for realtime events
  const roomRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchRooms = useCallback(() => {
    if (roomRefreshTimerRef.current) return;
    roomRefreshTimerRef.current = setTimeout(() => {
      roomRefreshTimerRef.current = null;
      fetchRooms();
    }, 800);
  }, [fetchRooms]);

  // Realtime subscription for room online counters + fallback poll
  useEffect(() => {
    const supabase = createClient();

    // Realtime: instant online counter updates when presence changes
    const presenceChannel = supabase
      .channel("rooms-presence-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence",
        },
        () => {
          debouncedFetchRooms();
        }
      )
      .subscribe();

    // Fallback poll every 2 minutes
    const interval = setInterval(fetchRooms, 120000);

    return () => {
      clearInterval(interval);
      if (roomRefreshTimerRef.current) clearTimeout(roomRefreshTimerRef.current);
      supabase.removeChannel(presenceChannel);
    };
  }, [fetchRooms, debouncedFetchRooms]);

  // Fetch DM conversations when user is available
  useEffect(() => {
    if (currentUserId) {
      fetchDMConversations();
      
      // Poll for new DMs every 30 seconds
      const interval = setInterval(fetchDMConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, fetchDMConversations]);

  if (isLoading || hasConsent === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  // Show consent modal for logged-in users who haven't accepted yet
  if (currentUserId && !hasConsent) {
    return <ChatConsentModal onAccept={() => setHasConsent(true)} />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat container - full page */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden bg-card transition-colors duration-300">
          
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
              ${/* Mobile: absolute overlay */ ""}
              fixed inset-y-0 left-0 z-30 w-72 transform bg-card shadow-lg transition-transform duration-300 md:relative md:z-0 md:shadow-none md:transition-all
              ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}
              ${/* Desktop: collapsed = icon strip, expanded = full width */ ""}
              ${sidebarCollapsed ? "md:w-14 md:translate-x-0" : "md:w-72 md:translate-x-0"}
              md:border-r md:border-border
            `}
          >
            <RoomList
              rooms={rooms}
              activeSlug={activeRoom?.slug}
              collapsed={sidebarCollapsed}
              isAdmin={isAdmin}
              onRoomSelect={handleRoomSelect}
              onManageRooms={() => setShowRoomManage(true)}
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
                      onClick={() => {
                        setShowDMPanel((prev) => !prev);
                      }}
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

                  {/* Role info button - visible for admin/mod/helper */}
                  {currentUserPermissions.length > 0 && (
                    <button
                      onClick={() => setShowRoleInfo(true)}
                      className="rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300"
                      title={lang === "el" ? "Ρόλοι & Δικαιώματα" : "Roles & Permissions"}
                    >
                      <BookOpen className="h-5 w-5" />
                    </button>
                  )}

                  {/* Banned users button - visible for admin/mod with ban or silence perms */}
                  {(currentUserPermissions.includes("ban_user") || currentUserPermissions.includes("silence_user")) && (
                    <button
                      onClick={() => setShowBannedPanel(true)}
                      className="rounded-lg p-2 text-foreground-muted hover:bg-border/30 transition-colors duration-300"
                      title={lang === "el" ? "Αποκλεισμένοι Χρήστες" : "Banned Users"}
                    >
                      <ShieldBan className="h-5 w-5" />
                    </button>
                  )}

                  {/* Toggle right panel button (desktop) */}
                  <button
                    onClick={() => {
                      if (showDMPanel) {
                        // Close DM panel and show users
                        setShowDMPanel(false);
                        setRightPanelCollapsed(false);
                      } else {
                        setRightPanelCollapsed((prev) => !prev);
                      }
                    }}
                    className={`hidden md:block rounded-lg p-2 transition-colors duration-300 ${
                      !showDMPanel && !rightPanelCollapsed ? "bg-navy-soft/10 text-navy-soft" : "text-foreground-muted hover:bg-border/30"
                    }`}
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
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-16 w-16 text-foreground-muted" />
                  <p className="mt-4 text-foreground-subtle">{labels.selectRoom}</p>
                </div>
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
                currentUserPermissions={currentUserPermissions}
                roomSlug={activeRoom?.slug}
                isCollapsed={rightPanelCollapsed}
                onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                onStartDM={handleStartDM}
                onModerate={(userId, userName) => setModerationTarget({ userId, userName })}
                onUndoAction={() => {
                  // Trigger a refresh of online users (moderation status will update)
                }}
              />
            </div>
          )}
        </div>

      {/* Moderation Menu */}
      {moderationTarget && (
        <ModerationMenu
          targetUserId={moderationTarget.userId}
          targetUserName={moderationTarget.userName}
          roomSlug={activeRoom?.slug}
          currentUserPermissions={currentUserPermissions}
          isSiteAdmin={isAdmin}
          allRoles={allRoles}
          targetUserRoles={onlineUsers.find(u => u.id === moderationTarget.userId)?.roles ?? []}
          onClose={() => setModerationTarget(null)}
          onActionComplete={() => {
            // Refresh online users (kicked/banned users will disappear)
            setModerationTarget(null);
          }}
        />
      )}

      {/* Role Info Modal */}
      {showRoleInfo && <RoleInfoModal onClose={() => setShowRoleInfo(false)} />}

      {/* Banned Users Panel */}
      {showBannedPanel && (
        <BannedUsersPanel
          onClose={() => setShowBannedPanel(false)}
          currentUserPermissions={currentUserPermissions}
        />
      )}

      {/* Room Management Modal (admin only) */}
      {showRoomManage && (
        <RoomManageModal
          rooms={rooms}
          onClose={() => setShowRoomManage(false)}
          onRoomsChanged={async () => {
            // Refresh rooms list
            try {
              const res = await fetch("/api/chat/rooms");
              if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms);
              }
            } catch {}
            setShowRoomManage(false);
          }}
        />
      )}

      {/* DM Overlays - floating windows with fixed slot positions */}
      {currentUserId && Array.from(openDMOverlays.entries()).map(([convId, { conversation, isMinimized, slot }]) => {
        return (
          <DMOverlay
            key={convId}
            conversation={conversation}
            currentUserId={currentUserId}
            onClose={() => handleCloseDMOverlay(convId)}
            onMinimize={() => handleToggleMinimizeDM(convId)}
            isMinimized={isMinimized}
            slotPosition={slot}
          />
        );
      })}

      {/* Moderation toast - notifies the current user if they are actioned */}
      {currentUserId && (
        <ModerationToast
          currentUserId={currentUserId}
          roomSlug={activeRoom?.slug}
        />
      )}
    </div>
  );
}
