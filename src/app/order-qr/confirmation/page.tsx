"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import AnimatedButton from "@/components/AnimatedButton";

const CART_STORAGE_KEY = "petpaw_order_cart";
const SHIPPING_STORAGE_KEY = "petpaw_order_shipping";

type CartItem = { product_id: string; quantity: number };
type ShippingStored =
  | { shipping_address_id: string }
  | { shipping_address: Record<string, string> };

export default function OrderQrConfirmationPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState<ShippingStored | null>(null);
  const [productName, setProductName] = useState<string>("QR Tag");
  const [unitPrice, setUnitPrice] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ order_id: string; order_number: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawCart = typeof window !== "undefined" ? sessionStorage.getItem(CART_STORAGE_KEY) : null;
    const rawShip = typeof window !== "undefined" ? sessionStorage.getItem(SHIPPING_STORAGE_KEY) : null;
    const parsedCart = rawCart ? (JSON.parse(rawCart) as CartItem[]) : [];
    const parsedShip = rawShip ? (JSON.parse(rawShip) as ShippingStored) : null;
    setCart(Array.isArray(parsedCart) ? parsedCart : []);
    setShipping(parsedShip);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const products = data.products ?? [];
      const product = products.find((p: { name: string }) => p.name.toLowerCase().includes("qr")) ?? products[0];
      if (product) {
        setProductName(product.name);
        setUnitPrice(product.price);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    let total = 0;
    for (const item of cart) {
      total += item.quantity * (unitPrice || 0);
    }
    setSubtotal(total);
  }, [cart, unitPrice]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !shipping) {
      setError("Missing cart or shipping details. Please go back.");
      return;
    }
    setPlacing(true);
    setError("");
    const body: { items: CartItem[]; shipping_address_id?: string; shipping_address?: Record<string, string>; save_address?: boolean } = {
      items: cart,
    };
    if ("shipping_address_id" in shipping) {
      body.shipping_address_id = shipping.shipping_address_id;
    } else if (shipping.shipping_address) {
      body.shipping_address = shipping.shipping_address as Record<string, string>;
      body.save_address = (shipping as { save_address?: boolean }).save_address === true;
    } else {
      setError("Invalid shipping data.");
      setPlacing(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      credentials: "include",
      body: JSON.stringify(body),
    });

    setPlacing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to place order.");
      return;
    }
    const result = await res.json();
    setPlaced({ order_id: result.order_id, order_number: result.order_number ?? result.order_id?.slice(0, 8) });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(SHIPPING_STORAGE_KEY);
    }
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("confirmation_title")}</h1>
        <p className="mt-4 text-lg text-foreground-muted">{t("confirmation_thanks")}</p>
        <p className="mt-2 font-semibold text-foreground">
          {t("confirmation_orderNumber")}: {placed.order_number}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <AnimatedButton href="/dashboard/orders" variant="primary">
            {t("confirmation_viewOrders")}
          </AnimatedButton>
          <AnimatedButton href="/dashboard" variant="outline">
            {t("confirmation_backDashboard")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  if (cart.length === 0 || !shipping) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("confirmation_title")}</h1>
        <p className="mt-4 text-foreground-muted">Your cart or shipping details are missing. Start from the order page.</p>
        <div className="mt-6">
          <AnimatedButton href="/order-qr" variant="primary">
            {t("order_title")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  const shippingAddr = shipping as Record<string, unknown>;
  const addressLine =
    shippingAddr.shipping_address && typeof shippingAddr.shipping_address === "object"
      ? (() => {
          const a = shippingAddr.shipping_address as Record<string, string>;
          return [a.full_name, a.address_line1, a.address_line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" "), a.country, a.phone].filter(Boolean).join(", ");
        })()
      : typeof shippingAddr.full_name === "string"
        ? [shippingAddr.full_name, shippingAddr.address_line1, shippingAddr.address_line2, [shippingAddr.city, shippingAddr.state, shippingAddr.postal_code].filter(Boolean).join(" "), shippingAddr.country, shippingAddr.phone].filter(Boolean).join(", ")
        : null;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("confirmation_title")}</h1>
      <p className="mt-2 text-foreground-muted">Review your order and place it.</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold text-foreground">{t("orderDetail_items")}</h2>
        <ul className="mt-2 space-y-1">
          {cart.map((item, i) => (
            <li key={i} className="flex justify-between text-foreground-muted">
              <span>
                {productName} × {item.quantity}
              </span>
              <span>€{(item.quantity * unitPrice).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold text-foreground">
          {t("order_subtotal")}: €{subtotal.toFixed(2)}
        </p>

        <h2 className="mt-6 text-lg font-semibold text-foreground">{t("orderDetail_shippingAddress")}</h2>
        <p className="mt-1 whitespace-pre-line text-foreground-muted">{addressLine ?? "—"}</p>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex gap-4">
        <AnimatedButton href="/order-qr/checkout" variant="outline">
          {t("common_back")}
        </AnimatedButton>
        <AnimatedButton variant="primary" onClick={handlePlaceOrder} disabled={placing}>
          {placing ? t("common_loading") : t("common_submit")}
        </AnimatedButton>
      </div>
    </div>
  );
}
