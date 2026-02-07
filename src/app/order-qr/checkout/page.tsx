"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { VALIDATION, isValidPhone } from "@/lib/validation";
import { getErrorKey } from "@/lib/errors";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const CART_STORAGE_KEY = "petpaw_order_cart";
const SHIPPING_STORAGE_KEY = "petpaw_order_shipping";

type CartItem = { product_id: string; quantity: number };
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

export default function OrderQrCheckoutPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem(CART_STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    setCart(Array.isArray(parsed) ? parsed : []);
  }, []);

  useEffect(() => {
    const fetchAddresses = async () => {
      const res = await fetch("/api/shipping-addresses", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setSavedAddresses(data.addresses ?? []);
    };
    fetchAddresses();
  }, []);

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
    if (!form.full_name.trim() || !form.address_line1.trim() || !form.city.trim() || !form.postal_code.trim() || !form.country.trim() || !form.phone.trim()) {
      setError(t(getErrorKey("E2001")));
      return;
    }
    if (!isValidPhone(form.phone)) {
      setError(t(getErrorKey("E2005")));
      return;
    }
    setLoading(true);
    if (useSavedId) {
      const payload = { ...form, shipping_address_id: useSavedId };
      if (typeof window !== "undefined") sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(payload));
      setLoading(false);
      router.push("/order-qr/confirmation");
      return;
    }
    if (saveAddress) {
      try {
        const res = await fetch("/api/shipping-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoading(false);
          const errorKey = data.code ? getErrorKey(data.code) : "error_unknown";
          setError(t(errorKey));
          return;
        }
        const payload = { ...form, shipping_address_id: data.id };
        if (typeof window !== "undefined") sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        setError(t(getErrorKey("E9001")));
        setLoading(false);
        return;
      }
    } else {
      if (typeof window !== "undefined") sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify({ shipping_address: form, save_address: false }));
    }
    setLoading(false);
    router.push("/order-qr/confirmation");
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("checkout_title")}</h1>
        <p className="mt-4 text-foreground-muted">Your cart is empty. Add items from the order page.</p>
        <div className="mt-6">
          <AnimatedButton href="/order-qr" variant="primary">
            {t("order_title")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("checkout_title")}</h1>
      <p className="mt-2 text-foreground-muted">Enter where you want your QR tags shipped.</p>

      {savedAddresses.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-background-secondary p-4 transition-colors duration-300">
          <Input
            as="select"
            id="saved-address-qr"
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-4 pt-4">
          <AnimatedButton href="/order-qr" variant="outline">
            {t("common_back")}
          </AnimatedButton>
          <AnimatedButton type="submit" variant="primary" disabled={loading}>
            {loading ? t("common_loading") : t("checkout_continueReview")}
          </AnimatedButton>
        </div>
      </form>
    </div>
  );
}
