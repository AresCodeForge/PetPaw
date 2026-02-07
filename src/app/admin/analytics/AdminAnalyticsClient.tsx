"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  BarChart,
  DonutChart,
  BarList,
} from "@tremor/react";
import {
  Users,
  ShoppingCart,
  DollarSign,
  QrCode,
  FileText,
  MessageSquare,
} from "lucide-react";

type TimeSeriesPoint = {
  date: string;
  value: number;
};

type AnalyticsData = {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalQrCodes: number;
  totalPosts: number;
  totalComments: number;
  userGrowth: TimeSeriesPoint[];
  orderTrend: TimeSeriesPoint[];
  revenueTrend: TimeSeriesPoint[];
  ordersByStatus: { status: string; count: number }[];
  qrCodeStats: { name: string; value: number }[];
  topPosts: { title: string; views: number; comments: number }[];
};

function StatCard({
  title,
  value,
  icon: Icon,
  format,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: "currency" | "number";
}) {
  const formattedValue =
    format === "currency"
      ? new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(value)
      : value.toLocaleString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-foreground-muted">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background-secondary">
          <Icon className="h-5 w-5 text-navy-soft" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{formattedValue}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsClient() {
  const { lang } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const analytics = await res.json();
        setData(analytics);
      } catch (e) {
        console.error("[PetPaw] Analytics error:", e);
        setError(lang === "el" ? "Αποτυχία φόρτωσης αναλύσεων" : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-600">
        {error || "No data available"}
      </div>
    );
  }

  // Transform data for Tremor charts
  const userGrowthData = data.userGrowth.map((p) => ({
    date: new Date(p.date).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      month: "short",
      day: "numeric",
    }),
    Users: p.value,
  }));

  const orderTrendData = data.orderTrend.map((p) => ({
    date: new Date(p.date).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      month: "short",
      day: "numeric",
    }),
    Orders: p.value,
  }));

  const revenueTrendData = data.revenueTrend.map((p) => ({
    date: new Date(p.date).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      month: "short",
      day: "numeric",
    }),
    Revenue: p.value,
  }));

  const orderStatusData = data.ordersByStatus.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }));

  const topPostsData = data.topPosts.map((p) => ({
    name: p.title.length > 40 ? p.title.substring(0, 40) + "..." : p.title,
    value: p.comments,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {lang === "el" ? "Αναλύσεις" : "Analytics"}
        </h1>
        <p className="text-foreground-muted">
          {lang === "el"
            ? "Στατιστικά και τάσεις του συστήματος"
            : "System statistics and trends"}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={lang === "el" ? "Χρήστες" : "Users"}
          value={data.totalUsers}
          icon={Users}
        />
        <StatCard
          title={lang === "el" ? "Παραγγελίες" : "Orders"}
          value={data.totalOrders}
          icon={ShoppingCart}
        />
        <StatCard
          title={lang === "el" ? "Έσοδα" : "Revenue"}
          value={data.totalRevenue}
          icon={DollarSign}
          format="currency"
        />
        <StatCard
          title={lang === "el" ? "Κωδικοί QR" : "QR Codes"}
          value={data.totalQrCodes}
          icon={QrCode}
        />
        <StatCard
          title={lang === "el" ? "Άρθρα" : "Posts"}
          value={data.totalPosts}
          icon={FileText}
        />
        <StatCard
          title={lang === "el" ? "Σχόλια" : "Comments"}
          value={data.totalComments}
          icon={MessageSquare}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Νέοι Χρήστες (30 ημέρες)" : "New Users (30 days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-72"
              data={userGrowthData}
              index="date"
              categories={["Users"]}
              colors={["blue"]}
              showLegend={false}
              showGridLines={false}
            />
          </CardContent>
        </Card>

        {/* Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Παραγγελίες (30 ημέρες)" : "Orders (30 days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-72"
              data={orderTrendData}
              index="date"
              categories={["Orders"]}
              colors={["emerald"]}
              showLegend={false}
              showGridLines={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Έσοδα (30 ημέρες)" : "Revenue (30 days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-72"
              data={revenueTrendData}
              index="date"
              categories={["Revenue"]}
              colors={["violet"]}
              showLegend={false}
              showGridLines={false}
              valueFormatter={(value) => `€${value.toFixed(2)}`}
            />
          </CardContent>
        </Card>

        {/* QR Code Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Κατάσταση QR Codes" : "QR Code Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-72"
              data={data.qrCodeStats}
              category="value"
              index="name"
              colors={["emerald", "gray"]}
              showLabel={true}
              valueFormatter={(value) => value.toString()}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Παραγγελίες ανά Κατάσταση" : "Orders by Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              data={orderStatusData}
              className="mt-4"
              color="blue"
            />
          </CardContent>
        </Card>

        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === "el" ? "Δημοφιλή Άρθρα (με σχόλια)" : "Popular Posts (by comments)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPostsData.length === 0 ? (
              <p className="text-center text-foreground-subtle py-4">
                {lang === "el" ? "Δεν υπάρχουν δεδομένα" : "No data available"}
              </p>
            ) : (
              <BarList
                data={topPostsData}
                className="mt-4"
                color="violet"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
