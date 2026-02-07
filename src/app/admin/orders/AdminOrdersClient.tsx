"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";

type OrderRow = {
  id: string;
  order_number: string;
  user_email: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
};

const STATUS_KEYS: Record<string, string> = {
  payment_pending: "orderStatus_payment_pending",
  pending: "orderStatus_pending",
  processing: "orderStatus_processing",
  shipped: "orderStatus_shipped",
  delivered: "orderStatus_delivered",
  cancelled: "orderStatus_cancelled",
};

export default function AdminOrdersClient() {
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/admin/orders", { credentials: "include" });
      setLoading(false);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders ?? []);
    };
    run();
  }, []);

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("admin_orders")}</h1>
      <p className="mt-2 text-foreground-muted">{t("admin_ordersDesc")}</p>

      {loading ? (
        <Loader label={t("common_loading")} />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm transition-colors duration-300">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("orders_orderNumber")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("orders_date")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_ownerEmail")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("orders_status")}</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("orders_total")}</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("orders_viewDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{o.order_number}</td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {new Date(o.created_at).toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">{o.user_email ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">{t(STATUS_KEYS[o.status] ?? o.status)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">€{o.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <AnimatedButton href={`/admin/orders/${o.id}`} variant="outline" size="sm">
                      {t("orders_viewDetails")}
                    </AnimatedButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <AnimatedButton href="/dashboard" variant="outline">
          {t("common_back")}
        </AnimatedButton>
      </div>
    </div>
  );
}
