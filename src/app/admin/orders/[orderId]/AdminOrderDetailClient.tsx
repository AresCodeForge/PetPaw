"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const STATUS_KEYS: Record<string, string> = {
  payment_pending: "orderStatus_payment_pending",
  pending: "orderStatus_pending",
  processing: "orderStatus_processing",
  shipped: "orderStatus_shipped",
  delivered: "orderStatus_delivered",
  cancelled: "orderStatus_cancelled",
};

const ALLOWED_STATUSES = ["payment_pending", "pending", "processing", "shipped", "delivered", "cancelled"] as const;

type OrderDetail = {
  order: {
    id: string;
    order_number: string;
    user_id?: string;
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
    address_line2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country: string;
    phone: string;
  } | null;
};

type Props = { orderId: string };

export default function AdminOrderDetailClient({ orderId }: Props) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: "include" });
      setLoading(false);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setStatus(json.order?.status ?? "");
      setTrackingNumber(json.order?.tracking_number ?? "");
      setCarrier(json.order?.carrier ?? "");
    };
    run();
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: status || undefined,
          tracking_number: trackingNumber || null,
          carrier: carrier || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: result.error ?? t("settings_fail"), error: true });
        return;
      }
      setMessage({ text: t("settings_success"), error: false });
      setData((prev) =>
        prev
          ? {
              ...prev,
              order: {
                ...prev.order,
                status: result.status ?? prev.order.status,
                tracking_number: result.tracking_number ?? prev.order.tracking_number,
                carrier: result.carrier ?? prev.order.carrier,
                updated_at: result.updated_at ?? prev.order.updated_at,
              },
            }
          : null
      );
    } finally {
      setSaving(false);
    }
  };

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
          <AnimatedButton href="/admin/orders" variant="outline">
            {t("common_back")}
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
      <p className="mt-1 text-sm text-foreground-muted">
        {t("orders_status")}: {statusLabel}
      </p>
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
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">{t("orderDetail_shippingAddress")}</h2>
            <button
              type="button"
              onClick={() => {
                const lines = [
                  order.order_number ? `Order: ${order.order_number}` : null,
                  shipping_address.full_name,
                  shipping_address.address_line1,
                  ...(shipping_address.address_line2 ? [shipping_address.address_line2] : []),
                  [shipping_address.city, shipping_address.state, shipping_address.postal_code].filter(Boolean).join(", "),
                  shipping_address.country,
                  shipping_address.phone,
                ].filter(Boolean);
                const content = lines.join("\n");
                const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const w = window.open("", "_blank", "width=400,height=300");
                if (w) {
                  w.document.write(
                    `<pre style="font-family:inherit;font-size:14px;line-height:1.5;margin:1in;white-space:pre-wrap;">${esc(content)}</pre>`
                  );
                  w.document.close();
                  w.focus();
                  w.print();
                  w.close();
                }
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-background-secondary"
              title="Print shipping label"
              aria-label="Print shipping label"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m-4 0 0 00-2-1v-2H9a2 2 0 00-2 2v2" />
              </svg>
              Print
            </button>
          </div>
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

      <section className="mt-8 rounded-2xl border border-border bg-background-secondary p-6 transition-colors duration-300">
        <h2 className="text-lg font-semibold text-foreground">{t("admin_orderUpdateStatus")}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            as="select"
            id="admin-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label={t("orders_status")}
          >
            {ALLOWED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEYS[s] ?? s)}
              </option>
            ))}
          </Input>
          <Input
            id="admin-tracking"
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            label={t("orderDetail_tracking")}
            placeholder="Tracking number"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
          <Input
            id="admin-carrier"
            type="text"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            label={t("orderDetail_carrier")}
            placeholder="Carrier name"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
          />
          {message && (
            <p className={`text-sm ${message.error ? "text-amber-700" : "text-navy-soft"}`}>{message.text}</p>
          )}
          <AnimatedButton type="submit" variant="primary" disabled={saving}>
            {saving ? t("common_loading") : t("settings_save")}
          </AnimatedButton>
        </form>
      </section>

      <div className="mt-8">
        <AnimatedButton href="/admin/orders" variant="outline">
          {t("orderDetail_backOrders")}
        </AnimatedButton>
      </div>
    </div>
  );
}
