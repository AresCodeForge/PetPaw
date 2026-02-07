import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { logAndCreateError } from "@/lib/errors";

export type ChatRoomRow = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  description_en: string | null;
  description_el: string | null;
  type: "global" | "topic" | "location";
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  unread_count?: number;
  online_count?: number;
};

// GET /api/chat/rooms - List all active chat rooms
export async function GET(request: NextRequest) {
  try {
    const admin = createSupabaseAdminClient();
    
    // Get current user for unread counts
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all active rooms
    const { data: rooms, error } = await admin
      .from("chat_rooms")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json(logAndCreateError("E5001", "GET /api/chat/rooms", error), { status: 500 });
    }

    // Get message counts and online users for each room
    const roomsWithStats = await Promise.all(
      (rooms ?? []).map(async (room) => {
        // Get online count (users active in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count: onlineCount } = await admin
          .from("chat_presence")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("is_online", true)
          .gte("last_seen", fiveMinutesAgo);

        let unreadCount = 0;
        
        if (user) {
          // Get user's last read timestamp for this room
          const { data: lastRead } = await admin
            .from("chat_last_read")
            .select("last_read_at")
            .eq("user_id", user.id)
            .eq("room_id", room.id)
            .single();

          // Count user messages after last read (exclude system messages)
          let unreadQuery = admin
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)
            .eq("is_deleted", false)
            .or("message_type.is.null,message_type.eq.user");

          if (lastRead?.last_read_at) {
            unreadQuery = unreadQuery.gt("created_at", lastRead.last_read_at);
          }

          const { count } = await unreadQuery;
          unreadCount = count ?? 0;
        }

        return {
          ...room,
          unread_count: unreadCount,
          online_count: onlineCount ?? 0,
        };
      })
    );

    return NextResponse.json({ rooms: roomsWithStats });
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/chat/rooms", e), { status: 500 });
  }
}
