"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";

const CART_STORAGE_KEY = "petpaw_order_cart";
const MAX_QUANTITY = 20;

type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null };

export default function OrderQrPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      setAuthChecked(true);
    };
    check();
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const fetchProducts = async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products ?? []);
      if ((data.products ?? []).length > 0 && quantity < 1) setQuantity(1);
    };
    fetchProducts();
  }, [authChecked]);

  const product = products.find((p) => p.name.toLowerCase().includes("qr")) ?? products[0];
  const price = product ? product.price : 0;
  const subtotal = price * quantity;

  const handleContinue = () => {
    if (!product || quantity < 1) return;
    const cart = [{ product_id: product.id, quantity }];
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
    router.push("/order-qr/checkout");
  };

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("order_title")}</h1>
        <p className="mt-4 text-foreground-muted">{t("order_loginRequired")}</p>
        <div className="mt-6">
          <AnimatedButton href={`/login?redirect=${encodeURIComponent("/order-qr")}`} variant="primary">
            {t("nav_login")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("order_title")}</h1>
      <p className="mt-2 text-foreground-muted">{t("order_chooseQuantity")}</p>

      {product ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
          <h2 className="text-xl font-semibold text-foreground">{product.name}</h2>
          {product.description && (
            <p className="mt-1 text-sm text-foreground-muted">{product.description}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{t("order_quantity")}</span>
              <input
                type="number"
                min={1}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(MAX_QUANTITY, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-20 rounded-xl border border-border bg-card px-3 py-2 text-foreground transition-colors duration-300 focus:border-mint focus:outline-none focus:ring-2 focus:ring-border"
              />
            </label>
            <span className="text-foreground-muted">
              {t("order_priceEach")}: €{price.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-lg font-semibold text-foreground">
              {t("order_subtotal")}: €{subtotal.toFixed(2)}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <AnimatedButton href="/dashboard" variant="outline">
              {t("common_back")}
            </AnimatedButton>
            <AnimatedButton variant="primary" onClick={handleContinue} disabled={quantity < 1}>
              {t("order_continueCheckout")}
            </AnimatedButton>
          </div>
        </div>
      ) : (
        <Loader label={t("common_loading")} />
      )}
    </div>
  );
}
