"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { VALIDATION, isValidPhone } from "@/lib/validation";
import { getErrorKey } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

type ShippingAddress = {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone: string;
  id?: string;
};

export default function CheckoutPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [useSavedId, setUseSavedId] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingAddress>({
    full_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Check if cart has physical items that need shipping
  const hasPhysicalItems = items.some((item) => item.type === "qr_tag");
  const hasProSubscription = items.some((item) => item.type === "pro_subscription");

  useEffect(() => {
    const check = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      setAuthChecked(true);
    };
    check();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      setLoading(true);
      const res = await fetch("/api/shipping-addresses", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSavedAddresses(data.addresses ?? []);
      }
      setLoading(false);
    };
    fetchAddresses();
  }, [user]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setUseSavedId(null);
  };

  const selectSaved = (addr: ShippingAddress & { id?: string }) => {
    if (addr.id) setUseSavedId(addr.id);
    setForm({
      full_name: addr.full_name,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 ?? "",
      city: addr.city,
      state: addr.state ?? "",
      postal_code: addr.postal_code,
      country: addr.country,
      phone: addr.phone,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate shipping address if needed
    if (hasPhysicalItems) {
      if (!form.full_name.trim() || !form.address_line1.trim() || !form.city.trim() || !form.postal_code.trim() || !form.country.trim() || !form.phone.trim()) {
        setError(t(getErrorKey("E2001")));
        return;
      }
      if (!isValidPhone(form.phone)) {
        setError(t(getErrorKey("E2005")));
        return;
      }
    }

    setSubmitting(true);

    try {
      // Save address if requested
      if (hasPhysicalItems && saveAddress && !useSavedId) {
        const res = await fetch("/api/shipping-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errorKey = data.code ? getErrorKey(data.code) : "error_unknown";
          setError(t(errorKey));
          setSubmitting(false);
          return;
        }
      }

      // Create order for physical items
      if (hasPhysicalItems) {
        const qrItems = items.filter((item) => item.type === "qr_tag");
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: qrItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
            })),
            shipping_address: form,
          }),
        });
        if (!orderRes.ok) {
          const data = await orderRes.json().catch(() => ({}));
          const errorKey = data.code ? getErrorKey(data.code) : "error_unknown";
          setError(t(errorKey));
          setSubmitting(false);
          return;
        }
      }

      // Handle Pro subscription (placeholder - would integrate with payment gateway)
      if (hasProSubscription) {
        // For now, just show success message
        // In production, this would redirect to Stripe/payment
      }

      setSuccess(true);
      clearCart();
    } catch {
      setError(t(getErrorKey("E9001")));
    }
    setSubmitting(false);
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
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("cart_checkout")}</h1>
        <p className="mt-4 text-foreground-muted">{t("order_loginRequired")}</p>
        <Link
          href={`/login?redirect=${encodeURIComponent("/checkout")}`}
          className="mt-6 inline-block rounded-full bg-mint px-6 py-3 font-semibold text-foreground transition-colors duration-300 hover:opacity-90"
        >
          {t("nav_login")}
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !success) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("cart_checkout")}</h1>
        <p className="mt-4 text-foreground-muted">{t("cart_empty")}</p>
        <Link href="/pricing" className="mt-6 inline-block rounded-full bg-mint px-6 py-3 font-semibold text-foreground transition-colors duration-300 hover:opacity-90">
          {t("nav_pricing")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-mint bg-mint/10 p-8 text-center transition-colors duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">{t("checkout_success")}</h1>
          <p className="mt-2 text-foreground-muted">{t("checkout_successDesc")}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-mint px-6 py-3 font-semibold text-foreground transition-colors duration-300 hover:opacity-90"
          >
            {t("common_back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("cart_checkout")}</h1>

      {/* Order Summary */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold text-foreground">{t("checkout_orderSummary")}</h2>
        <ul className="mt-4 divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${item.type}-${item.product_id ?? index}`} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-foreground-muted">
                  {item.quantity} × €{item.price.toFixed(2)}
                </p>
              </div>
              <p className="font-semibold text-foreground">€{(item.price * item.quantity).toFixed(2)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-lg font-semibold text-foreground">{t("cart_total")}</span>
          <span className="text-xl font-bold text-foreground">€{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Shipping Address (only if physical items) */}
      {hasPhysicalItems && (
        <form onSubmit={handleSubmit} className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">{t("checkout_shippingAddress")}</h2>

          {savedAddresses.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-background-secondary p-4 transition-colors duration-300">
              <Input
                as="select"
                id="saved-address"
                value={useSavedId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setUseSavedId(null);
                    setForm({
                      full_name: "",
                      address_line1: "",
                      address_line2: "",
                      city: "",
                      state: "",
                      postal_code: "",
                      country: "",
                      phone: "",
                    });
                    return;
                  }
                  const addr = savedAddresses.find((a) => a.id === id);
                  if (addr) selectSaved(addr);
                }}
                label={t("checkout_useSaved")}
              >
                <option value="">{t("checkout_selectAddress")}</option>
                {savedAddresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.full_name}, {addr.address_line1}, {addr.city}, {addr.country}
                  </option>
                ))}
              </Input>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <Input
              id="full_name"
              type="text"
              required
              maxLength={VALIDATION.MAX_NAME_LENGTH}
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              label={`${t("checkout_fullName")} *`}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <Input
              id="address_line1"
              type="text"
              required
              maxLength={VALIDATION.MAX_ADDRESS_LINE}
              value={form.address_line1}
              onChange={(e) => handleChange("address_line1", e.target.value)}
              label={`${t("checkout_addressLine1")} *`}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <Input
              id="address_line2"
              type="text"
              maxLength={VALIDATION.MAX_ADDRESS_LINE}
              value={form.address_line2}
              onChange={(e) => handleChange("address_line2", e.target.value)}
              label={t("checkout_addressLine2")}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="city"
                type="text"
                required
                maxLength={VALIDATION.MAX_ADDRESS_LINE}
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                label={`${t("checkout_city")} *`}
              />
              <Input
                id="postal_code"
                type="text"
                required
                maxLength={VALIDATION.MAX_POSTAL_LENGTH}
                value={form.postal_code}
                onChange={(e) => handleChange("postal_code", e.target.value)}
                label={`${t("checkout_zipCode")} *`}
              />
            </div>
            <Input
              id="state"
              type="text"
              maxLength={VALIDATION.MAX_ADDRESS_LINE}
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
              label={t("checkout_state")}
            />
            <Input
              id="country"
              type="text"
              required
              maxLength={VALIDATION.MAX_ADDRESS_LINE}
              value={form.country}
              onChange={(e) => handleChange("country", e.target.value)}
              label={`${t("checkout_country")} *`}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <Input
              id="phone"
              type="tel"
              required
              maxLength={20}
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              label={`${t("checkout_phone")} *`}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />
            {!useSavedId && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="rounded border-border transition-colors duration-300" />
                <span className="text-sm text-foreground">{t("checkout_saveAddress")}</span>
              </label>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-8 flex flex-wrap gap-4">
            <AnimatedButton href="/pricing" variant="outline">
              {t("common_back")}
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={submitting}>
              {submitting ? t("common_loading") : t("checkout_placeOrder")}
            </AnimatedButton>
          </div>
        </form>
      )}

      {/* Pro subscription only (no shipping needed) */}
      {!hasPhysicalItems && hasProSubscription && (
        <div className="mt-8">
          <p className="text-foreground-muted">{t("checkout_proNoShipping")}</p>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-4">
            <AnimatedButton href="/pricing" variant="outline">
              {t("common_back")}
            </AnimatedButton>
            <AnimatedButton onClick={handleSubmit} variant="primary" disabled={submitting}>
              {submitting ? t("common_loading") : t("checkout_placeOrder")}
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  );
}
