"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";

type OrderDetail = {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    tracking_number: string | null;
    carrier: string | null;
    created_at: string;
    updated_at: string;
  };
  items: Array<{
    id: string;
    product_id: string;
    product_name: string | null;
    quantity: number;
    price_per_item: number;
    line_total: number;
  }>;
  shipping_address: {
    full_name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string | null;
    postal_code: string;
    country: string;
    phone: string;
  } | null;
}

const STATUS_KEYS: Record<string, string> = {
  payment_pending: "orderStatus_payment_pending",
  pending: "orderStatus_pending",
  processing: "orderStatus_processing",
  shipped: "orderStatus_shipped",
  delivered: "orderStatus_delivered",
  cancelled: "orderStatus_cancelled",
};

export default function DashboardOrderDetailPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string | undefined;
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const run = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      setLoading(false);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    };
    run();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-foreground-muted">Order not found.</p>
        <div className="mt-4">
          <AnimatedButton href="/dashboard/orders" variant="outline">
            {t("orderDetail_backOrders")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  const { order, items, shipping_address } = data;
  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  const statusLabel = t(STATUS_KEYS[order.status] ?? order.status);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("orderDetail_title")}</h1>
      <p className="mt-2 font-mono text-foreground-muted">
        {t("orders_orderNumber")}: {order.order_number}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{t("orders_status")}:</span>
        <span className="inline-flex items-center rounded-full bg-navy-soft/15 px-3 py-1 text-sm font-semibold text-navy-soft">
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        {new Date(order.created_at).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold text-foreground">{t("orderDetail_items")}</h2>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-foreground-muted">
              <span>
                {item.product_name ?? "Product"} × {item.quantity}
              </span>
              <span>€{item.line_total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold text-foreground">
          {t("orders_total")}: €{order.total_amount.toFixed(2)}
        </p>
      </section>

      {shipping_address && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
          <h2 className="text-lg font-semibold text-foreground">{t("orderDetail_shippingAddress")}</h2>
          <p className="mt-2 text-foreground-muted">
            {shipping_address.full_name}
            <br />
            {shipping_address.address_line1}
            {shipping_address.address_line2 && (
              <>
                <br />
                {shipping_address.address_line2}
              </>
            )}
            <br />
            {[shipping_address.city, shipping_address.state, shipping_address.postal_code].filter(Boolean).join(", ")}
            <br />
            {shipping_address.country}
            <br />
            {shipping_address.phone}
          </p>
        </section>
      )}

      {(order.tracking_number || order.carrier) && (
        <section className="mt-6 rounded-2xl border border-border bg-background-secondary p-6">
          <h2 className="text-lg font-semibold text-foreground">{t("orderDetail_tracking")}</h2>
          {order.carrier && <p className="mt-1 text-sm text-foreground-muted">{t("orderDetail_carrier")}: {order.carrier}</p>}
          {order.tracking_number && (
            <p className="mt-1 font-mono text-foreground">{order.tracking_number}</p>
          )}
        </section>
      )}

      <div className="mt-8">
        <AnimatedButton href="/dashboard/orders" variant="outline">
          {t("orderDetail_backOrders")}
        </AnimatedButton>
      </div>
    </div>
  );
}
