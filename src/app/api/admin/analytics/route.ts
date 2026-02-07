import { NextResponse } from "next/server";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";
import { logAndCreateError, createError } from "@/lib/errors";

type TimeSeriesPoint = {
  date: string;
  value: number;
};

type AnalyticsData = {
  // Summary stats
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalQrCodes: number;
  totalPosts: number;
  totalComments: number;
  
  // Time series data
  userGrowth: TimeSeriesPoint[];
  orderTrend: TimeSeriesPoint[];
  revenueTrend: TimeSeriesPoint[];
  
  // Distributions
  ordersByStatus: { status: string; count: number }[];
  qrCodeStats: { name: string; value: number }[];
  
  // Top content
  topPosts: { title: string; views: number; comments: number }[];
};

/**
 * GET /api/admin/analytics
 * Returns aggregated analytics data (admin only)
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(createError("E1001"), { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(createError("E1002"), { status: 403 });
    }

    // Fetch all data in parallel
    const [
      profilesResult,
      ordersResult,
      qrCodesResult,
      postsResult,
      commentsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id, created_at"),
      supabase.from("orders").select("id, status, total, created_at"),
      supabase.from("qr_codes").select("id, pet_id, created_at"),
      supabase.from("blog_posts").select("id, title_en, status, published_at"),
      supabase.from("blog_comments").select("id, post_id, created_at"),
    ]);

    const profiles = profilesResult.data ?? [];
    const orders = ordersResult.data ?? [];
    const qrCodes = qrCodesResult.data ?? [];
    const posts = postsResult.data ?? [];
    const comments = commentsResult.data ?? [];

    // Calculate summary stats
    const totalUsers = profiles.length;
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === "completed" || o.status === "shipped")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const totalQrCodes = qrCodes.length;
    const totalPosts = posts.filter((p) => p.status === "published").length;
    const totalComments = comments.length;

    // User growth over last 30 days
    const userGrowth = calculateTimeSeries(profiles, 30);

    // Order trend over last 30 days
    const orderTrend = calculateTimeSeries(orders, 30);

    // Revenue trend over last 30 days
    const revenueTrend = calculateRevenueSeries(orders, 30);

    // Orders by status
    const statusCounts: Record<string, number> = {};
    for (const order of orders) {
      const status = order.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // QR code stats (linked vs unlinked)
    const linkedQr = qrCodes.filter((q) => q.pet_id !== null).length;
    const unlinkedQr = qrCodes.length - linkedQr;
    const qrCodeStats = [
      { name: "Linked", value: linkedQr },
      { name: "Unlinked", value: unlinkedQr },
    ];

    // Top posts by comments
    const commentsByPost: Record<string, number> = {};
    for (const comment of comments) {
      commentsByPost[comment.post_id] = (commentsByPost[comment.post_id] || 0) + 1;
    }
    const topPosts = posts
      .filter((p) => p.status === "published")
      .map((p) => ({
        title: p.title_en,
        views: 0, // Placeholder - would need view tracking
        comments: commentsByPost[p.id] || 0,
      }))
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 5);

    const analytics: AnalyticsData = {
      totalUsers,
      totalOrders,
      totalRevenue,
      totalQrCodes,
      totalPosts,
      totalComments,
      userGrowth,
      orderTrend,
      revenueTrend,
      ordersByStatus,
      qrCodeStats,
      topPosts,
    };

    return NextResponse.json(analytics);
  } catch (e) {
    return NextResponse.json(logAndCreateError("E9001", "GET /api/admin/analytics", e), { status: 500 });
  }
}

function calculateTimeSeries(
  items: { created_at?: string }[],
  days: number
): TimeSeriesPoint[] {
  const now = new Date();
  const result: TimeSeriesPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const count = items.filter((item) => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at).toISOString().split("T")[0];
      return itemDate === dateStr;
    }).length;

    result.push({ date: dateStr, value: count });
  }

  return result;
}

function calculateRevenueSeries(
  orders: { created_at?: string; total?: number; status?: string }[],
  days: number
): TimeSeriesPoint[] {
  const now = new Date();
  const result: TimeSeriesPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const revenue = orders
      .filter((order) => {
        if (!order.created_at) return false;
        if (order.status !== "completed" && order.status !== "shipped") return false;
        const orderDate = new Date(order.created_at).toISOString().split("T")[0];
        return orderDate === dateStr;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);

    result.push({ date: dateStr, value: revenue });
  }

  return result;
}
