"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { MessageCircle, Dog, Cat, Heart, GraduationCap, Users, Settings } from "lucide-react";
import Link from "next/link";

type ChatRoom = {
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

type Props = {
  rooms: ChatRoom[];
  activeSlug?: string;
  collapsed?: boolean;
  isAdmin?: boolean;
  onRoomSelect?: (slug: string) => void;
  onManageRooms?: () => void;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Dog,
  Cat,
  Heart,
  GraduationCap,
  Users,
};

export default function RoomList({ rooms, activeSlug, collapsed, isAdmin, onRoomSelect, onManageRooms }: Props) {
  const { lang } = useLanguage();

  const labels = {
    en: {
      rooms: "Rooms",
      online: "online",
      unread: "unread",
    },
    el: {
      rooms: "Δωμάτια",
      online: "online",
      unread: "αδιάβαστα",
    },
  }[lang];

  return (
    <div className="flex h-full flex-col bg-card transition-colors duration-300">
      {/* Header - hide text when collapsed */}
      {!collapsed && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">{labels.rooms}</h2>
          {isAdmin && onManageRooms && (
            <button
              onClick={onManageRooms}
              className="rounded-lg p-1.5 text-foreground-muted hover:bg-border/30 transition-colors duration-150"
              title={lang === "el" ? "Διαχ. Δωματίων" : "Manage Rooms"}
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {rooms.map((room) => {
          const name = lang === "el" ? room.name_el : room.name_en;
          const description = lang === "el" ? room.description_el : room.description_en;
          const isActive = room.slug === activeSlug;
          const IconComponent = room.icon && iconMap[room.icon] ? iconMap[room.icon] : MessageCircle;
          const hasUnread = (room.unread_count ?? 0) > 0;

          // ── Collapsed: icon-only with unread dot ──
          if (collapsed) {
            return (
              <Link
                key={room.id}
                href={`/chat/${room.slug}`}
                onClick={(e) => {
                  if (onRoomSelect) {
                    e.preventDefault();
                    onRoomSelect(room.slug);
                  }
                }}
                className={`relative flex items-center justify-center py-3 transition-colors duration-300 hover:bg-background-secondary ${
                  isActive ? "bg-background-secondary border-l-4 border-l-navy-soft" : ""
                }`}
                title={name}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
                  isActive ? "bg-navy-soft text-white" : "bg-border/30 text-foreground-muted"
                }`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                {/* Unread badge */}
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-soft px-1 text-[9px] font-bold text-white">
                    {room.unread_count! > 99 ? "99+" : room.unread_count}
                  </span>
                )}
              </Link>
            );
          }

          // ── Expanded: full room row ──
          return (
            <Link
              key={room.id}
              href={`/chat/${room.slug}`}
              onClick={(e) => {
                if (onRoomSelect) {
                  e.preventDefault();
                  onRoomSelect(room.slug);
                }
              }}
              className={`flex items-center gap-3 border-b border-border px-4 py-3 transition-colors duration-300 hover:bg-background-secondary ${
                isActive ? "bg-background-secondary border-l-4 border-l-navy-soft" : ""
              }`}
            >
              <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                isActive ? "bg-navy-soft text-white" : "bg-border/30 text-foreground-muted"
              }`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate flex-1 ${isActive ? "text-navy-soft" : "text-foreground"}`}>
                    {name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(room.online_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs tabular-nums text-green-600 dark:text-green-400">{room.online_count}</span>
                      </div>
                    )}
                    {hasUnread && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-soft px-1.5 text-xs font-bold text-white">
                        {room.unread_count! > 99 ? "99+" : room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                {description && (
                  <p className="text-xs text-foreground-subtle truncate">{description}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
