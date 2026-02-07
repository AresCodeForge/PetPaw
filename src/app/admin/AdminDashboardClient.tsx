"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShoppingCart,
  QrCode,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PawPrint,
  DollarSign,
  Eye,
} from "lucide-react";

type DashboardStats = {
  totalUsers: number;
  totalOrders: number;
  totalQrCodes: number;
  totalPosts: number;
  totalPets: number;
  pendingOrders: number;
  totalRevenue: number;
  userGrowth: number;
  orderGrowth: number;
};

type RecentOrder = {
  id: string;
  user_email: string;
  total: number;
  status: string;
  created_at: string;
};

type RecentUser = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
};

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  href,
  lang,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  lang: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow transition-colors duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-foreground-muted">
          {title}
        </CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background-secondary">
          <Icon className="h-5 w-5 text-navy-soft" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center justify-between mt-2">
          {change && (
            <p
              className={`flex items-center text-xs ${
                changeType === "positive"
                  ? "text-green-600"
                  : changeType === "negative"
                  ? "text-red-600"
                  : "text-foreground-muted"
              }`}
            >
              {changeType === "positive" ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : changeType === "negative" ? (
                <TrendingDown className="mr-1 h-3 w-3" />
              ) : null}
              {change}
            </p>
          )}
          <Link
            href={href}
            className="flex items-center text-xs text-navy-soft hover:underline transition-colors duration-300"
          >
            {lang === "el" ? "Προβολή" : "View"}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardClient() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats from various endpoints
        const [usersRes, ordersRes, qrRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/orders"),
          fetch("/api/admin/qr-stats"),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
        const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
        const qrData = qrRes.ok ? await qrRes.json() : { total: 0 };

        // Calculate stats
        const users = usersData.users || [];
        const orders = ordersData.orders || [];
        const pendingOrders = orders.filter((o: { status: string }) => o.status === "pending").length;
        const totalRevenue = orders
          .filter((o: { status: string }) => o.status === "completed" || o.status === "shipped")
          .reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0);

        setStats({
          totalUsers: users.length,
          totalOrders: orders.length,
          totalQrCodes: qrData.total || 0,
          totalPosts: 0, // Will be fetched separately
          totalPets: qrData.linked || 0,
          pendingOrders,
          totalRevenue,
          userGrowth: 12, // Placeholder
          orderGrowth: 8, // Placeholder
        });

        // Set recent data
        setRecentOrders(
          orders.slice(0, 5).map((o: { id: string; email?: string; total?: number; status?: string; created_at?: string }) => ({
            id: o.id,
            user_email: o.email || "Unknown",
            total: o.total || 0,
            status: o.status || "pending",
            created_at: o.created_at || new Date().toISOString(),
          }))
        );

        setRecentUsers(
          users.slice(0, 5).map((u: { id: string; name?: string; email?: string; created_at?: string }) => ({
            id: u.id,
            name: u.name || null,
            email: u.email || "Unknown",
            created_at: u.created_at || new Date().toISOString(),
          }))
        );
      } catch (error) {
        console.error("[PetPaw] Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {lang === "el" ? "Πίνακας Ελέγχου" : "Dashboard"}
        </h1>
        <p className="text-foreground-muted">
          {lang === "el"
            ? "Επισκόπηση του συστήματος PetPaw"
            : "Overview of your PetPaw system"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={lang === "el" ? "Συνολικοί Χρήστες" : "Total Users"}
          value={stats?.totalUsers || 0}
          change={`+${stats?.userGrowth || 0}% ${lang === "el" ? "αυτό το μήνα" : "this month"}`}
          changeType="positive"
          icon={Users}
          href="/admin/users"
          lang={lang}
        />
        <StatCard
          title={lang === "el" ? "Παραγγελίες" : "Orders"}
          value={stats?.totalOrders || 0}
          change={`${stats?.pendingOrders || 0} ${lang === "el" ? "σε εκκρεμότητα" : "pending"}`}
          changeType="neutral"
          icon={ShoppingCart}
          href="/admin/orders"
          lang={lang}
        />
        <StatCard
          title={lang === "el" ? "Έσοδα" : "Revenue"}
          value={formatCurrency(stats?.totalRevenue || 0)}
          change={`+${stats?.orderGrowth || 0}% ${lang === "el" ? "αυτό το μήνα" : "this month"}`}
          changeType="positive"
          icon={DollarSign}
          href="/admin/orders"
          lang={lang}
        />
        <StatCard
          title={lang === "el" ? "Κωδικοί QR" : "QR Codes"}
          value={stats?.totalQrCodes || 0}
          change={`${stats?.totalPets || 0} ${lang === "el" ? "συνδεδεμένα" : "linked"}`}
          changeType="neutral"
          icon={QrCode}
          href="/admin/qr-batch"
          lang={lang}
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {lang === "el" ? "Πρόσφατες Παραγγελίες" : "Recent Orders"}
              </CardTitle>
              <CardDescription>
                {lang === "el"
                  ? "Οι τελευταίες 5 παραγγελίες"
                  : "Your latest 5 orders"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">
                {lang === "el" ? "Όλες" : "View All"}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center text-foreground-subtle py-4">
                {lang === "el" ? "Δεν υπάρχουν παραγγελίες" : "No orders yet"}
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {order.user_email}
                      </p>
                      <p className="text-xs text-foreground-subtle">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {lang === "el" ? "Νέοι Χρήστες" : "New Users"}
              </CardTitle>
              <CardDescription>
                {lang === "el"
                  ? "Οι τελευταίες 5 εγγραφές"
                  : "Latest 5 registrations"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">
                {lang === "el" ? "Όλοι" : "View All"}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-center text-foreground-subtle py-4">
                {lang === "el" ? "Δεν υπάρχουν χρήστες" : "No users yet"}
              </p>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-soft text-white text-sm font-medium">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-foreground-subtle truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-foreground-subtle">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === "el" ? "Γρήγορες Ενέργειες" : "Quick Actions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/admin/blog/new">
                <FileText className="mr-2 h-4 w-4" />
                {lang === "el" ? "Νέο Άρθρο" : "New Blog Post"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/qr-batch">
                <QrCode className="mr-2 h-4 w-4" />
                {lang === "el" ? "Δημιουργία QR" : "Generate QR Codes"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/orders?status=pending">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {lang === "el" ? "Εκκρεμείς Παραγγελίες" : "Pending Orders"}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/" target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                {lang === "el" ? "Προβολή Ιστοσελίδας" : "View Website"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
